---
title: Reverse Engineering Electrolux IR Protocol for ESPHome and Home Assistant
description: Learn how to reverse engineer the IR protocol of an Electrolux AC and build a custom ESPHome external component to control it from Home Assistant.
tags: diy, reverse-engineering, ir-remote, ac, electrolux, esphome, esp32, home-assistant
date: 2025-07-17
---

Hello there!

# Intro

In this article, I describe how I reverse-engineered the Electrolux IR protocol and implemented a custom external component for ESPHome to control the AC.

# Why Build a Custom IR Controller?

Let's start with the backstory. Why do I need to create a custom IR controller for the AC. Can't I use manufacturer controllers, Wi-Fi or any other existing options?

I bought a portable AC from Electrolux (EXP26U339HW) several months ago. It has several options to control it. The first one is physical buttons on the device. They are ok to turn it off or on, but I'm too lazy to go up to change the temperature or mode each time. The second option is Wi-Fi with the official Android/iOS app. This option is significantly better because the AC is connected to the internet, so, you can control the AC from anywhere, not just a local network.

The constant connection to the internet is a double-edged sword. Yes, you can control the device from anywhere. Turn it on before you come home. Set a timer or a schedule to turn it on/off at specific hours/days. But at the same time, there is a device that is constantly connected to the internet and has access to your local network. It is a huge security problem because you have to rely on Electrolux engineers to do everything right and provide all security updates. We all know that is not going to happen. Over time, this particular model will be obsolete, and no one will provide updates. Also, we already have a lot of cases for other "smart" devices with huge security breaches. So, I simply don't trust Electrolux to support their servers 24/7 and keep them up and providing updates. I could partially solve this problem by using the guest network on my router. It's just yet another Wi-Fi network, but isolated from other devices. So, even if someone has the AC, they won't have access to the "main" network.

The app was fine for several weeks but then suddenly started to lag and went down for 2 days. I guess the bug was in the timer functionality because in the next update, they disabled it completely. So, I wasn't able to use the app for several days.

The AC has a small plastic "window" on the front side. Maybe it is a window to allow the IR signal to pass. Maybe I can control the AC via a remote. The problem is how I can test it. Luckily, I have an old Android smartphone (Xiaomi Mi 5) with an IR port and an app specifically to control different devices. So, looks like the problem is solved, and I don't need to connect the AC to Wi-Fi.

Why do we need this article? I'm using this phone as a music player and it is usually connected to speakers. So, I still need to move my ass to change the temperature. At this point, I can just use physical buttons.

So, I decided to DIY my own IR remote control to solve this problem and because it is an interesting and fun task.

# Solution

The initial idea was to buy an IR Transmitter and an IR Receiver, connect them to ESP32 (I had one unused microcontroller), use it to dump all commands from my "phone" remote, reverse engineer the protocol, create a simple web server on ESP32 with UI to control the AC.

But then I recalled that there is a project - ESPHome to connect the ESP32 controller to Home Assistant. So, now we don't need to create a web server and UI anymore. We could rely on Home Assistant. Also, it provides some additional features like automation and scripting.

Then I found out that ESPHome has a built-in component for ACs: [IR Climate](https://esphome.io/components/climate/climate_ir.html). And maybe, we don't need to do anything at all. Just install ESPHome/Home Assistant, connect the IR, profit. Unfortunately, it didn't work for me. So, the only option is to implement my own external component.

# Reverse Engineering

It is the most important task for this project. The IR Climate component allows for configuring different options: select the AC mode, the fan speed, the swing direction, and the temperature. We need to be able to dynamically build a message based on selected options and send it to the AC.

I started experimenting with ESPHome and Home Assistant before my IR Transmitter and IR Receiver arrived. I wanted to learn how to install Home Assistant, how to flash ESPHome and some basic options. So, I'll be ready when my order arrives. The installation process and configuration are not so complex. You just need to follow the documentation.

## Pronto format

When my order arrived, I assembled the first prototype to dump all messages. You need to specify `dump: all` option in the `remote_receiver` component, and all messages will appear in logs. `remote_receiver` tries to decode some known protocols or display raw data otherwise. It was exactly my case. After pressing a button on my phone, I was able to see a message in the `Pronto` format.

Here is an example of such a message:

```
0000 006D 006A 0000 0158 00AF 0014 0042 0015 0042 0015 0015 0016 0016 0014 0017 0014 0017 0014 0042 0015 0041 0015 0017 0015 0015 0015 0016 0016 0014 0016 0042 0015 0016 0014 0016 0015 0041 0016 0016 0015 0016 0015 0016 0014 0017 0014 0015 0016 0016 0015 0016 0015 0016 0014 0017 0014 0016 0015 0017 0014 0015 0016 0016 0015 0016 0015 0015 0015 0017 0014 0016 0016 0015 0015 0016 0015 0016 0015 0016 0014 0042 0015 0016 0016 0015 0015 0016 0015 0016 0014 0017 0014 0017 0014 0016 0015 0016 0015 0016 0015 0016 0014 0017 0014 0017 0014 0016 0015 0016 0015 0016 0015 0016 0014 0043 0014 0042 0015 0016 0015 0016 0015 0016 0014 0017 0014 0015 0016 0016 0016 0015 0015 0016 0015 0016 0014 0017 0014 0017 0014 0016 0016 0015 0015 0016 0015 0016 0014 0017 0014 0017 0014 0016 0015 0016 0015 0016 0015 0016 0015 0042 0014 0017 0015 0015 0015 0016 0015 0016 0015 0016 0014 0017 0015 0016 0015 0015 0015 0016 0015 0016 0015 0016 0014 0017 0014 0017 0014 0016 0016 0015 0015 0016 0014 0017 0015 0016 0015 0041 0015 0042 0015 0016 0014 0017 0015 0041 0015 0016 0016 0041 0014 0017 0014 0180
```

As you can see it is quite lengthy. The remote sends the entire desired state of the AC instead of just a command to change one specific parameter.

The IR signal encodes data as a sequense of pulses (high signal) and spaces (low signal) of specified length. For example: `0` is equal to 500μs pulse and 500μs space. `1` - 500μs pulse, 1500μs space (the sequence of pulse and space is called a pair). These timings could be represented in different formats. The `raw` format, which is just a sequence of timings. The `pronto` format - a sequence of timings encoded in a specific way.

The first 4 hex values (`0000 006D 006A 0000`) in pronto format represent metadata.

- `0000` is always zero.
- `006D` specifies a frequency and is calculated by `1000000 / (N * 0.241246)`, in our case 38kHz, the common frequency for IR remotes.
- `006A` specifies the number of bits (pairs) encoded in the message.
- `0000` specifies the amount of sequences (messages) sent together, in our case, it is always `0`.

The next pairs will specify actual timings. To convert these values to microseconds you need to use the following formula: `1000000 * (to_dec(<hex_value>) / frequency)`. For example, `0014` means `1000000 * (20 / 38000) = 526μs`.

The first pair (pulse, space) is always long. It is some kind of a hello message for IR: "Look, I'll send you a message right now, be ready". In our case, it is `0158 00AF` = `9046μs 4602μs`.

There is a special pair at the end of each message that represents the end. It has a very long space part to separate several messages from each other. For example, `0014 0180` = `526μs 10098μs`.

## Electrolux Message

We get the idea of how to convert Pronto format to the actual sequence of bits. Now let's try to decode the example message from previous section. We will receive the following sequence:

```
11000011 00001001 00000000 00000000 00000100 00000000 00000011 00000000 00000000 00000100 00000000 00000000 11001010
```

Do you see a pattern? No, right, I don't see it either. The only thing we can definitely say is that the message has 13 bytes. We need more information to find patterns and understand where different parameters are stored.

I collected several messages for different states and parameter combinations: mode (AUTO, COOL, FAN, HEAT, DRY), fan speed (AUTO, LOW, MID, HIGH), temperature, sleep mode, timer, swing. I aggregated all of them in a single csv file, uploaded it to Google Drive, and opened it in Google Sheets. Each column represents a separate bit position. It is easier to spot patterns in the table view. Here is an example of this view:

![Electrolux IR](/2025/images/ElectroluxIr.png)

where:

- green - I'm 100% sure.
- yellow - I'm not 100% sure, probably right.
- gray and white - unused block, whether they are just empty or we don't know about the information in it.

| Offset | Size | Meaning               | Value                                                              |
| ------ | ---- | --------------------- | ------------------------------------------------------------------ |
| 0      | 8    | Constant Header       | Always `11000011`                                                  |
| 8      | 3    | Swing                 | Off - `111`, On - `000`                                            |
| 11     | 5    | Temperature (C)       | Calculated as `<expected_temp> - 8`                                |
| 16     | 16   | Unused                |                                                                    |
| 32     | 5    | Timer (unused)        | Probably hours                                                     |
| 37     | 3    | Fan Speed             | Auto - `101`, Low - `011`, Mid - `010`, High - `001`               |
| 40     | 5    | Timer (unused)        | Probably minutes                                                   |
| 46     | 4    | Unused                |                                                                    |
| 50     | 1    | Sleep (unused)        | On - `1`, Off - `0`                                                |
| 51     | 2    | Unused                |                                                                    |
| 53     | 3    | Mode                  | Auto - `000`, Cool - `001`, Fan - `110`, Heat - `100`, Dry - `010` |
| 56     | 21   | Unused                |                                                                    |
| 77     | 1    | On/Off                | On - `1`, Off - `0`                                                |
| 78     | 1    | Timer On/Off (unused) | On - `1`, Off - `0`                                                |
| 79     | 9    | Unused                |                                                                    |
| 88     | 4    | Buttons (unused)      |                                                                    |
| 92     | 4    | Unused                |                                                                    |
| 96     | 8    | Checksum              | Truncated sum of all previous bytes                                |

I got carried away and parsed patterns for the timer and the sleep mode. We don't need these features because IR Climate doesn't support it and it can be easily replaced by Home Assistant.

## Useful tools

- [sensus](https://pasthev.github.io/sensus/) - the web site to analyse IR Signals. Allows to convert between different representations, analyse and get decoded binary data.
- [IrScrutinizer](https://github.com/bengtmartensson/IrScrutinizer) - the same thing but in the form of Java Application.

# Custom ESPHome component

ESPHome supports creating custom external components. There is an [official developers site](https://developers.esphome.io/), but you don't even need to go through it. The better option is to take a look at the following GitHub project: [starter-components](https://github.com/esphome/starter-components). It provides several examples of empty components, so you can use one of them as a placeholder to experiment with your build. After that, you can take a look at existing implementations of the IR Climate component, for example: [tcl112](https://github.com/esphome/esphome/tree/dev/esphome/components/tcl112).

So, I've created the [esphome-electrolux-ac](https://github.com/sys27/esphome-electrolux-ac) GitHub project with an external component. You can try if you want to control the Electrolux AC from Home Assistant.

Here is a listing of the implementation:

<details>
<summary>electrolux_ac_component.h and electrolux_ac_component.cpp</summary>

```cpp
#pragma once

#include "esphome/components/climate_ir/climate_ir.h"
#include "esphome/components/remote_base/remote_base.h"

namespace esphome
{
    namespace electrolux_ac
    {
        const float ELECTROLUX_TEMP_MAX = 32.0;
        const float ELECTROLUX_TEMP_MIN = 16.0;
        const float ELECTROLUX_TEMP_STEP = 1.0;
        const bool ELECTROLUX_SUPPORTS_DRY = true;
        const bool ELECTROLUX_SUPPORTS_FAN_ONLY = true;

        class ElectroluxClimate : public climate_ir::ClimateIR
        {
        public:
            ElectroluxClimate()
                : climate_ir::ClimateIR(
                      ELECTROLUX_TEMP_MIN,
                      ELECTROLUX_TEMP_MAX,
                      ELECTROLUX_TEMP_STEP,
                      ELECTROLUX_SUPPORTS_DRY,
                      ELECTROLUX_SUPPORTS_FAN_ONLY,
                      {climate::CLIMATE_FAN_AUTO, climate::CLIMATE_FAN_LOW, climate::CLIMATE_FAN_MEDIUM, climate::CLIMATE_FAN_HIGH},
                      {climate::CLIMATE_SWING_OFF, climate::CLIMATE_SWING_VERTICAL}) {}

        protected:
            void transmit_state() override;

        private:
            void setConstHeader(uint8_t *arr) const;
            void setSwingMode(uint8_t *arr) const;
            void setTemp(uint8_t *arr) const;
            void setFanSpeed(uint8_t *arr);
            void setMode(uint8_t *arr) const;
            void setState(uint8_t *arr) const;
            void setChecksum(uint8_t *arr) const;
            void logPacket(uint8_t *arr) const;
            void writePacketToData(esphome::remote_base::RemoteTransmitData *data, uint8_t *arr) const;
        };
    }
}
```

```cpp
#include "electrolux_ac_component.h"
#include "esphome/core/log.h"

namespace esphome
{
    namespace electrolux_ac
    {
        static const char *const TAG = "electrolux.climate";

        const uint8_t PACKET_SIZE = 13;
        const uint16_t FREQUENCY = 38000;
        const uint16_t HEADER_MARK = 8950;
        const uint16_t HEADER_SPACE = 4530;
        const uint16_t BIT_MARK = 563;
        const uint16_t ONE_SPACE = 1690;
        const uint16_t ZERO_SPACE = 538;
        const uint16_t FOOTER_SPACE = 10000;

        void ElectroluxClimate::transmit_state()
        {
            auto transmit = this->transmitter_->transmit();
            auto *data = transmit.get_data();

            data->set_carrier_frequency(FREQUENCY);

            data->item(HEADER_MARK, HEADER_SPACE);

            uint8_t arr[PACKET_SIZE] = {0};
            setConstHeader(arr);
            setSwingMode(arr);
            setTemp(arr);
            setFanSpeed(arr);
            setMode(arr);
            setState(arr);
            setChecksum(arr);

            logPacket(arr);
            writePacketToData(data, arr);

            data->item(BIT_MARK, FOOTER_SPACE);

            transmit.perform();
        }

        void ElectroluxClimate::setConstHeader(uint8_t *arr) const
        {
            arr[0] = 0b11000011;
        }

        void ElectroluxClimate::setSwingMode(uint8_t *arr) const
        {
            if (this->swing_mode != climate::CLIMATE_SWING_VERTICAL)
                arr[1] = 0b11100000;
            else
                arr[1] = 0b00000000;
        }

        void ElectroluxClimate::setTemp(uint8_t *arr) const
        {
            auto temp = static_cast<uint8_t>(
                std::clamp(this->target_temperature, ELECTROLUX_TEMP_MIN, ELECTROLUX_TEMP_MAX) - 8);
            temp = reverse_bits(temp) >> 3;

            arr[1] |= temp;
        }

        void ElectroluxClimate::setFanSpeed(uint8_t *arr)
        {
            auto fanSpeed = this->fan_mode.value_or(climate::CLIMATE_FAN_LOW);
            if (fanSpeed == climate::CLIMATE_FAN_AUTO &&
                (this->mode == climate::CLIMATE_MODE_DRY ||
                 this->mode == climate::CLIMATE_MODE_FAN_ONLY))
            {
                fanSpeed = climate::CLIMATE_FAN_LOW;
                this->set_fan_mode_(fanSpeed);
            }

            uint8_t fanByte = 0;
            switch (fanSpeed)
            {
            case climate::CLIMATE_FAN_AUTO:
                fanByte = 0b00000101;
                break;
            case climate::CLIMATE_FAN_LOW:
                fanByte = 0b00000110;
                break;
            case climate::CLIMATE_FAN_MEDIUM:
                fanByte = 0b00000010;
                break;
            case climate::CLIMATE_FAN_HIGH:
                fanByte = 0b00000100;
                break;
            }

            arr[4] = fanByte;
        }

        void ElectroluxClimate::setMode(uint8_t *arr) const
        {

            if (this->mode == climate::CLIMATE_MODE_OFF)
                return;

            uint8_t modeByte = 0;
            switch (this->mode)
            {
            case climate::CLIMATE_MODE_AUTO:
                modeByte = 0b00000000;
                break;
            case climate::CLIMATE_MODE_COOL:
                modeByte = 0b00000100;
                break;
            case climate::CLIMATE_MODE_HEAT:
                modeByte = 0b00000001;
                break;
            case climate::CLIMATE_MODE_FAN_ONLY:
                modeByte = 0b00000011;
                break;
            case climate::CLIMATE_MODE_DRY:
                modeByte = 0b00000010;
                break;
            }

            arr[6] = modeByte;
        }

        void ElectroluxClimate::setState(uint8_t *arr) const
        {
            if (this->mode != climate::CLIMATE_MODE_OFF)
                arr[9] = 0b00000100;
            else
                arr[9] = 0b00000000;
        }

        void ElectroluxClimate::setChecksum(uint8_t *arr) const
        {
            uint8_t checksum = 0;
            for (auto i = 0; i < PACKET_SIZE - 1; ++i)
                checksum += reverse_bits(arr[i]);

            arr[12] = reverse_bits(checksum);
        }

        void ElectroluxClimate::logPacket(uint8_t *arr) const
        {
            for (auto i = 0; i < PACKET_SIZE; i++)
                ESP_LOGD(TAG, "Sending: %02X.", arr[i]);
        }

        void ElectroluxClimate::writePacketToData(esphome::remote_base::RemoteTransmitData *data, uint8_t *arr) const
        {
            for (auto i = 0; i < PACKET_SIZE; i++)
            {
                auto byte = arr[i];

                for (auto i = 7; i >= 0; --i)
                {
                    data->mark(BIT_MARK);

                    if (byte & (1 << i))
                        data->space(ONE_SPACE);
                    else
                        data->space(ZERO_SPACE);
                }
            }
        }
    }
}
```
</details>

# Conclusion

This project allowed me to:

- Remove the dependency on an unreliable and insecure cloud-based AC control system.
- Gain full control of my AC using Home Assistant.
- Learn about IR protocols, reverse engineering, and ESPHome's powerful custom component system.

If you have an Electrolux AC (or similar device) and want local control, feel free to try the [GitHub project](https://github.com/sys27/esphome-electrolux-ac). I’d love feedback or contributions!