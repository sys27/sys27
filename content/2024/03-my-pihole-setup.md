---
title: My Pihole Setup
tags: pihole, dns
date: 2024-05-01
---

Hello there.

### What is Pihole?

[Pihole](https://pi-hole.net/) is a network-level ad-blocking application. It acts as a DNS server that can be installed on a local network server and used to block advertisement domains across all devices connected to the network. Pi-hole prevents ads from appearing on devices like smartphones, tablets, and computers. When a device tries to access a domain, Pi-hole checks its blocklist to see if the domain is on the list of ad domains. If it is, Pi-hole blocks the request, preventing the device from connecting to the domain. 

Pi-hole can be installed on various devices, including Raspberry Pi (exactly my case), Linux servers, Docker containers, and even on some routers. It provides a web interface for configuration and monitoring, allowing users to view statistics about blocked requests and manage their blocklists.

### Setup

There are several ways to install Pihole. I personally prefer to run it as a Docker image because I really like the convenience of pulling and running Docker containers but also isolation from a host. I don't need to install any dependencies or configure a host. Just pull the image, run it, stop, delete and my host is not affected in any way.

To run Pihole in Docker, you can follow official documentation and start a single container. But my setup is a little bit different. In addition to a pihole container, I'm using two additional containers. One is for the `unbound` DNS resolver and the second one is a DHCP relay.

### Unbound

> Unbound is a validating, recursive, caching DNS resolver. It is designed to be fast and lean and incorporates modern features based on open standards.
> https://github.com/NLnetLabs/unbound

Instead of using my provider's DNS server, I decided to configure my own and use root DNS servers to resolve domain names. To do it, I decided to create a small docker image based on `alpine` and install `unbound` and `dns-root-hints` there. This package is needed to tell `unbound` what and where root DNS servers are. Here is Dockerfile and configuration:

```
FROM alpine:latest
EXPOSE 55353
RUN apk add --no-cache dns-root-hints unbound
COPY unbound.conf /etc/unbound/unbound.conf
ENTRYPOINT ["unbound", "-d"]
```

<details>
<summary>unbound.conf</summary>

```
server:
    # verbosity number, 0 is least verbose. 1 is default.
    verbosity: 0
    logfile: /dev/stdout

    # number of threads to create. 1 disables threading.
    num-threads: 1

    # specify the interfaces to answer queries from by ip-address.
    # The default is to listen to localhost (127.0.0.1 and ::1).
    # specify 0.0.0.0 and ::0 to bind to all available interfaces.
    # specify every interface[@port] on a new 'interface:' labelled line.
    # The listen interfaces are not changed on reload, only on restart.
    interface: 0.0.0.0

    # port to answer queries from
    port: 55353

    # Set this to yes to prefer ipv6 upstream servers over ipv4.
    prefer-ip6: no

    # EDNS reassembly buffer to advertise to UDP peers (the actual buffer
    # is set with msg-buffer-size).
    edns-buffer-size: 1472 #1232

    # the amount of memory to use for the message cache.
    # plain value in bytes or you can append k, m or G. default is "4Mb".
    msg-cache-size: 30m

    # the amount of memory to use for the RRset cache.
    # plain value in bytes or you can append k, m or G. default is "4Mb".
    rrset-cache-size: 70m

    # Enable IPv4, "yes" or "no".
    do-ip4: yes

    # Enable IPv6, "yes" or "no".
    do-ip6: no

    # Enable UDP, "yes" or "no".
    do-udp: yes

    # Enable TCP, "yes" or "no".
    do-tcp: yes

    # Detach from the terminal, run in background, "yes" or "no".
    # Set the value to "no" when unbound runs as systemd service.
    do-daemonize: no

    # control which clients are allowed to make (recursive) queries
    # to this server. Specify classless netblocks with /size and action.
    # By default everything is refused, except for localhost.
    # Choose deny (drop message), refuse (polite error reply),
    # allow (recursive ok), allow_setrd (recursive ok, rd bit is forced on),
    # allow_snoop (recursive and nonrecursive ok)
    # deny_non_local (drop queries unless can be answered from local-data)
    # refuse_non_local (like deny_non_local but polite error reply).
    access-control: 127.0.0.0/8 allow
    access-control: 172.31.0.0/16 allow

    # file to read root hints from.
    # get one from https://www.internic.net/domain/named.cache
    root-hints: /usr/share/dns-root-hints/named.root

    # Harden against very small EDNS buffer sizes.
    harden-short-bufsize: yes

    # Harden against unseemly large queries.
    harden-large-queries: yes

    # Harden against out of zone rrsets, to avoid spoofing attempts.
    harden-glue: yes

    # Harden against receiving dnssec-stripped data. If you turn it
    # off, failing to validate dnskey data for a trustanchor will
    # trigger insecure mode for that zone (like without a trustanchor).
    # Default on, which insists on dnssec data for trust-anchored zones.
    harden-dnssec-stripped: yes

    # Harden against algorithm downgrade when multiple algorithms are
    # advertised in the DS record.  If no, allows the weakest algorithm
    # to validate the zone.
    harden-algo-downgrade: yes

    # Sent minimum amount of information to upstream servers to enhance
    # privacy. Only sent minimum required labels of the QNAME and set QTYPE
    # to A when possible.
    qname-minimisation: yes

    # Use 0x20-encoded random bits in the query to foil spoof attempts.
    # This feature is an experimental implementation of draft dns-0x20.
    use-caps-for-id: no

    # Enforce privacy of these addresses. Strips them away from answers.
    # It may cause DNSSEC validation to additionally mark it as bogus.
    # Protects against 'DNS Rebinding' (uses browser as network proxy).
    # Only 'private-domain' and 'local-data' names are allowed to have
    # these private addresses. No default.
    private-address: 10.0.0.0/8
    private-address: 172.16.0.0/12
    private-address: 192.168.0.0/16
    private-address: 169.254.0.0/16
    private-address: fd00::/8
    private-address: fe80::/10
    private-address: ::ffff:0:0/96

    # if yes, perform prefetching of almost expired message cache entries.
    prefetch: yes

    # if yes, perform key lookups adjacent to normal lookups.
    prefetch-key: yes

    # deny queries of type ANY with an empty response.
    deny-any: yes

    # if yes, Unbound rotates RRSet order in response.
    rrset-roundrobin: yes

    # if yes, Unbound doesn't insert authority/additional sections
    # into response messages when those sections are not required.
    minimal-responses: yes

    # File with trusted keys for validation. Specify more than one file
    # with several entries, one file per entry.
    # Zone file format, with DS and DNSKEY entries.
    # Note this gets out of date, use auto-trust-anchor-file please.
    trust-anchor-file: "/usr/share/dnssec-root/trusted-key.key"

# Remote control config section.
remote-control:
        # Enable remote control with unbound-control(8) here.
        # set up the keys and certificates with unbound-control-setup.
        control-enable: yes

        # what interfaces are listened to for remote control.
        # give 0.0.0.0 and ::0 to listen to all interfaces.
        # set to an absolute path to use a unix local name pipe, certificates
        # are not used for that, so key and cert files need not be present.
        control-interface: /run/unbound.control.sock
        # control-interface: 127.0.0.1
        # control-interface: ::1
```
</details>

### DHCP relay

If you want to run pihole as a DHCP server and in the bridge mode, you need to use a DHCP relay. Otherwise, Pihole's DHCP won't be able to access (or respond) to broadcast messages. DHCP listens for UDP broadcast messages on port #67, if any client wants to get a configuration from this DHCP server, it sends a UPD message and then DHCP server sends a configuration back.

But we have one problem - the Docker bridge network. It's a virtual network created by Docker with its own routes/gateway/etc. and for the majority of use cases, it works fine. But it doesn't work for broadcast messages. So, DHCP server doesn't receive a request or can't send a response. To fix it, we can run pihole in the "host" network mode. Or if you still want to use bridge network, then you need to run an additional container - DHCP relay, This new container runs in the host mode and relays all messages received on the host network into the virtual bridge network. Here is Dockerfile:

```
FROM alpine:latest
RUN apk add --no-cache dhcp-helper
EXPOSE 67 67/udp
ENTRYPOINT ["dhcp-helper", "-n"]
```

### Docker Compose

And the final `docker-compose.yml` file. It starts 3 containers: `pihole`, `unbound` and `dhcphelper`. Also, it uses a default network but provides stable controlled CIDR for it. 

The `pihole` container has the `DNS1` env variable to configure a DNS server address and it uses IP address of our `unbound` container. All other options are optional and could be changed/removed.

<details>
<summary>docker-compose.yml</summary>

```yaml
services:
  pihole:
    container_name: pihole
    hostname: pihole
    image: pihole/pihole:latest
    ports:
      - "53:53/tcp"
      - "53:53/udp"
    environment:
      - ServerIP=192.168.31.105
      - VIRTUAL_HOST=pihole.home
      - DNSMASQ_LISTENING=all
      - TZ=Europe/Kyiv
      - DNS1=172.31.0.110#55353
      - QUERY_LOGGING=false
    volumes:
       - '/etc/pihole/:/etc/pihole/'
       - '/etc/pihole/dnsmasq.d/:/etc/dnsmasq.d/'
    restart: unless-stopped
    depends_on:
      - dhcphelper
      - unbound
    networks:
      default:
        ipv4_address: '172.31.0.100'
      nginx-network:
    cap_add:
        - NET_ADMIN
    mem_limit: 500m
    mem_reservation: 100m

  dhcphelper:
    container_name: dhcphelper
    build: ./dhcp-helper
    restart: unless-stopped
    network_mode: "host"
    command: -s 172.31.0.100
    cap_add:
      - NET_ADMIN
    mem_limit: 10m
    mem_reservation: 6m

  unbound:
    container_name: unbound
    build: ./unbound
    restart: unless-stopped
    networks:
      default:
        ipv4_address: '172.31.0.110'
    mem_limit: 100m
    mem_reservation: 75m

networks:
  default:
    ipam:
      config:
        - subnet: 172.31.0.0/16
```
</details>
