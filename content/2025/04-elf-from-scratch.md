---
title: How to create ELF from scratch
description: 
tags: linux, elf, compilers
date: 2025-06-01
---

# Intro

Hello there!

A long time ago, as a college student project, I created a library to parse mathematical expressions: [xFunc](https://github.com/sys27/xFunc). Over time, I added a lot of features. The latest of them are lambdas, curring, rational numbers, etc. A simple library started to look more and more like a small programming language, which defeats the idea of the library: to be a small library to parse mathematical expressions and nothing more.

So recently, I decided to start to work on my programming language: [GitHub](https://github.com/trilang/trilang). It is still in development and will be in this state for several years at least. At some point, I will need to generate a binary executable. So, to distract myself from parsing, I decided to investigate the structure of an ELF file and create one such file from scratch.

# The ELF file structure

So, let's start with the elf file structure. The internet already has a lot of articles about it. There is an official `System V` documentation, Linux docs, and a lot of 3rd party articles, but you can just open a wiki page and get a pretty good explanation of how an elf file should look. And for the completeness of this article, I will add the structure here.

The elf file consists of these major parts (we are going to discuss files only 64-bit systems):

- ELF header
- Program Headers
- Section Headers
- Content

The content is just a part of the file that contains actual code or data, or other resources. Whereas all other parts are metadata which describes this content or needed OS to load/execute a program or some tools to compile/link this file.

The order of these sections is not important. The only restriction is that the ELF header should be at the beginning of the file. Any other section could be placed anywhere in the file.

## ELF header

Each ELF file should start with the ELF header. It's just basic information about ELF, on what OS/CPU it is expected to run, whre the starting point is, and where all sections are.

| Size (bytes) | Field          | Description                                                       |
| -----------: | :------------- | :---------------------------------------------------------------- |
|            4 | Magin Number   | 0x7F followed by 'ELF' (0x45, 0x4C, 0x46).                        |
|            1 | Class          | 2 for 64-bit format.                                              |
|            1 | Data           | 1 - little endian. 2 - big endian.                                |
|            1 | Ident Version  | Always 1.                                                         |
|            1 | OS             | Identifies the target operating system.                           |
|            1 | ABI Version    | ABI version. Interpretation depends on target ABI. Often ignored. |
|            7 | Padding        | Reserved padding bytes. Should be filled with zeros.              |
|            2 | Type           | Object file type.                                                 |
|            2 | ISA            | Target instruction set architecture.                              |
|            4 | Version        | Always 1.                                                         |
|            8 | Entry          | Entry point virtual address.                                      |
|            8 | Program Header | Program header table offset.                                      |
|            8 | Session Header | Section header table offset.                                      |
|            4 | Flags          | Architecture-specific flags.                                      |
|            2 | ELF Size       | ELF header size (64 for 64-bit).                                  |
|            2 | PH Size        | Size of one program header entry.                                 |
|            2 | PH Count       | Number of program header entries.                                 |
|            2 | SH Size        | Size of one section header entry.                                 |
|            2 | SH Count       | Number of section header entries.                                 |
|            2 | Section Names  | Index of the section header with section names.                   |

### OS Values:

Here are some values for OS field: `System V = 0x00`, `Linux = 0x03`. Usually, it is equal to `System V` even on a `Linux` distribution and I'm not sure it really affects anything.

### File Type:

| Value | Type    | Meaning         |
| ----- | ------- | --------------- |
| 0x00  | ET_NONE | Unknown         |
| 0x02  | ET_EXEC | Executable file |
| 0x03  | ET_DYN  | Shared object   |
| ...   | ...     | ...             |

### ISA Values:

| Value | ISA                         |
| ----- | --------------------------- |
| 0x3E  | AMD x86-64                  |
| 0xB7  | Arm 64-bits (Armv8/AArch64) |
| ...   | ...                         |

## Program Headers

The program headers table contains information needed for OS to understand how to load your program into memory and allocate all necessary blocks for execution:

| Size (bytes) | Field            | Description                                                     |
| ------------ | ---------------- | --------------------------------------------------------------- |
| 4            | Type             | Identifies the type of the segment.                             |
| 4            | Flags            | Segment-dependent flags.                                        |
| 8            | Offset           | Offset of the segment in the file image.                        |
| 8            | Virtual Address  | Virtual address of the segment in memory.                       |
| 8            | Physical Address | Physical address (if relevant).                                 |
| 8            | File Size        | Size of the segment in the file image.                          |
| 8            | Memory Size      | Size of the segment in memory.                                  |
| 8            | Alignment        | Segment alignment. 0 or 1 = no alignment. Otherwise power of 2. |

There are some restrictions on several fields.

The first one is that the segments that are loaded into memory must have `Virtual Address` and `Offset` fields congruent modulo `Alignment`: `Virtual Address` % `Alignment` = `Offset` % `Alignment`.

The second one is pretty much similar but for the page size of OS: `Virtual Address` % `Page Size` = `Offset` % `Page Size`.

Otherwise, the OS will show the `Segmentation Fault` error or other strange errors. For example, the segment might not be executable, even if it has the proper executable flag. 

Often `Virtual Address` and `Physical Address` fields are equal, the same for `File Size` and `Memory Size` with some small exceptions. For example, the part of memory with uninitialized data (zeros). We don't need and don't want to put all these zero bytes into the file. It will increase the file size without any good reason but instead, we could use `File Size` and `Memory Size` fields. Set `File Size` to 0 and `Memory Size` to a needed value. So, the OS will create a segment of memory with zeros while the size of file is not affected.

### Program Header Type Values

| Value      | Name      | Meaning                                                           |
| ---------- | --------- | ----------------------------------------------------------------- |
| 0x00000000 | PT_NULL   | Program header table entry unused.                                |
| 0x00000001 | PT_LOAD   | Loadable segment. E.g. code or data segments.                     |
| 0x00000003 | PT_INTERP | Interpreter information. Isn't needed for static linked binaries. |
| 0x00000006 | PT_PHDR   | Segment containing program header table itself.                   |
| ...        | ...       | ...                                                               |

### Flag Values:

| Value | Name | Meaning             |
| ----- | ---- | ------------------- |
| 0x1   | PF_X | Executable segment. |
| 0x2   | PF_W | Writable segment.   |
| 0x4   | PF_R | Readable segment.   |

## Section Headers

The section headers table is not required for execution. The OS will be able to run the program even if there are no section headers at all. But they are needed for linking and debugging. Usually, this table is stored at the end of the ELF file.

| Offset | Size (bytes) | Field      | Purpose                                                                      |
| ------ | ------------ | ---------- | ---------------------------------------------------------------------------- |
| 0x00   | 4            | Name       | Offset to a string in the `.shstrtab` section representing the section name. |
| 0x04   | 4            | Type       | Identifies the type of the section.                                          |
| 0x08   | 8            | Flags      | Attributes of the section.                                                   |
| 0x10   | 8            | Address    | Virtual address of the section in memory (for loaded sections).              |
| 0x18   | 8            | Offset     | Offset of the section in the file image.                                     |
| 0x20   | 8            | Size       | Size in bytes of the section. May be 0.                                      |
| 0x28   | 4            | Link       | Section index of an associated section. Purpose depends on section type.     |
| 0x2C   | 4            | Info       | Extra information about the section. Purpose depends on section type.        |
| 0x30   | 8            | Alignment  | Required alignment of the section (must be a power of 2).                    |
| 0x38   | 8            | Entry Size | Size of each entry for sections with fixed-size entries, or 0 otherwise.     |

The section headers table has a similar restriction as the program headers table: `Address` % `Alignment` == 0.

### Section Header Types:

| Value | Name         | Meaning                                              |
| ----- | ------------ | ---------------------------------------------------- |
| 0x0   | SHT_NULL     | Section header table entry unused.                   |
| 0x1   | SHT_PROGBITS | Program data (code or data).                         |
| 0x3   | SHT_STRTAB   | String table. List of null-terminated strings.       |
| 0x8   | SHT_NOBITS   | Program space with no data/uninitialized data (BSS). |
| ...   | ...          | ...                                                  |

### Section Header Flags: 

| Value | Name          | Meaning                          |
| ----- | ------------- | -------------------------------- |
| 0x1   | SHF_WRITE     | Writable                         |
| 0x2   | SHF_ALLOC     | Occupies memory during execution |
| 0x4   | SHF_EXECINSTR | Executable                       |
| ...   | ...           | ...                              |

# Generate ELF file

The generation of ELF files is straightforward. You just need to follow the format described above but there is one problem. Some sections have a reference (offset) to the sections defined later in the file. For example, the ELF header has offset to the Program Headers table and the Section Headers table. So, you have two options. The first one is to generate the ELF header with offset unset and fill them later. Or skip these sections and generate them later them the other parts of the file are known.

I decided to go with the second approach and create a whole file in memory and then write it to the disk. Each part of the file is represented by an implementation of `ISegment`:

```csharp
internal interface ISegment
{
    string SegmentName { get; }
    long FileOffset { get; set; }
    long FileSize { get; }

    void WriteTo(BinaryStream stream);
}
```

This defines an important part of the output file, the offset where this particular part should be placed and its size. So, for the ELF header, I created a separate class with all necessary fields and code to write into the stream. The same for other parts nothing special. Also, I created a "placeholder" implementation:

```csharp
internal class NullSegment : ISegment
{
    public NullSegment(string name, long fileOffset, long fileSize)
    {
        FileOffset = fileOffset;
        FileSize = fileSize;
        SegmentName = name;
    }

    public void WriteTo(BinaryStream stream)
        => stream.Write(new byte[FileSize]);

    public string SegmentName { get; }

    public long FileOffset { get; set; }

    public long FileSize { get; }
}
```

It does nothing, just writes a bunch of zeros to the file. It is needed for sections with forward references to other segments. So, we can "reserve" the space in the file and at the same time calculate correct offsets. Also, I created a container for all segments:

```csharp
internal class OutputFile
{
    private readonly List<ISegment> segments = [];

    public void Add(ISegment segment)
    {
        var lastSegment = segments.LastOrDefault();
        var lastSegmentOffset = lastSegment?.FileOffset ?? 0;
        var lastSegmentSize = lastSegment?.FileSize ?? 0;
        var segmentOffset = lastSegmentOffset + lastSegmentSize;
        segment.FileOffset = segmentOffset;

        segments.Add(segment);
    }

    public void Set(string name, ISegment segment)
    {
        var index = segments.FindIndex(x => x.SegmentName == name);
        if (index < 0)
            throw new InvalidOperationException($"Segment {name} does not exist");

        var existing = segments[index];
        if (segment.FileSize != existing.FileSize)
            throw new InvalidOperationException("Cannot set segment with different offset or size");

        segment.FileOffset = existing.FileOffset;

        segments[index] = segment;
    }

    public void WriteTo(BinaryStream stream)
    {
        foreach (var segment in Segments)
        {
            stream.Seek(segment.FileOffset, SeekOrigin.Begin);

            segment.WriteTo(stream);
        }
    }
}
```

It is needed to automatically calculate offsets. So, instead of getting the last segment and calculating it manually each time, this class is doing it for us. And at last, the final part, the code which combines everything to create ELF:

```csharp
internal class ElfWriter
{
    private const string ElfHeaderName = "ELF Header";
    private const string ProgramHeaderName = "Program Header";
    private const string PhCodeName = "PH Code";
    private const string PhDataName = "PH Data";
    private const string ContentCodeName = "Content Code";
    private const string ContentDataName = "Content Data";
    private const string ContentShStrTabName = "Content Shstrtab";
    private const string ShNullName = "SH Null";
    private const string ShTextName = "SH Text";
    private const string ShDataName = "SH Text";
    private const string ShShStrTabName = "SH ShStrTab";

    private const ulong BaseAddress = 0x00400000;

    public void Write(ElfOptions options)
    {
        var outputFile = new OutputFile();

        // add null segments to calculate offsets correctly
        outputFile.Add(new NullSegment(ElfHeaderName, ElfHeader.ElfHeaderSize));

        var nullProgramHeader = new NullSegment(ProgramHeaderName, ElfHeader.PhSize);
        outputFile.Add(nullProgramHeader);
        outputFile.Add(new NullSegment(PhCodeName, ElfHeader.PhSize));
        outputFile.Add(new NullSegment(PhDataName, ElfHeader.PhSize));

        var contentCode = new DataSegment(ContentCodeName, [
            // TODO: assembly code
        ]);
        outputFile.Add(contentCode);

        var contentData = new DataSegment(ContentDataName, [
            // TODO: data
        ]);
        outputFile.Add(contentData);

        var shstrtab = new StringSegment(ContentShStrTabName);
        var shstrtabOffset = shstrtab.Add(".shstrtab");
        var textOffset = shstrtab.Add(".text");
        var dataOffset = shstrtab.Add(".data");
        outputFile.Add(shstrtab);

        // add section headers
        var sectionHeader = SectionHeader.CreateNullSection(ShNullName);
        outputFile.Add(sectionHeader);
        var codeSection = SectionHeader.CreateProgBits(
            segmentName: ShTextName,
            nameOffset: (uint)textOffset,
            address: BaseAddress + (ulong)contentCode.FileOffset,
            offset: (ulong)contentCode.FileOffset,
            size: (ulong)contentCode.FileSize,
            alignment: 8);
        outputFile.Add(codeSection);
        var dataSection = SectionHeader.CreateData(
            segmentName: ShDataName,
            nameOffset: (uint)dataOffset,
            address: BaseAddress + 0x10000 + (ulong)contentData.FileOffset,
            offset: (ulong)contentData.FileOffset,
            size: (ulong)contentData.FileSize,
            alignment: 1);
        outputFile.Add(dataSection);
        outputFile.Add(SectionHeader.CreateShStrTab(
            segmentName: ShShStrTabName,
            nameOffset: (uint)shstrtabOffset,
            offset: (ulong)shstrtab.FileOffset,
            size: (ulong)shstrtab.FileSize));

        // populate null segments
        outputFile.Set(ProgramHeaderName, ProgramHeader.CreateProgramHeader(
            segmentName: ProgramHeaderName,
            offset: (ulong)nullProgramHeader.FileOffset,
            address: BaseAddress + (ulong)nullProgramHeader.FileOffset,
            phFileSize: 3 * ElfHeader.PhSize, // TODO: calculate?
            alignment: 0
        ));
        outputFile.Set(PhCodeName, ProgramHeader.CreateProgramHeaderCode(
            segmentName: PhCodeName,
            offset: 0,
            address: BaseAddress,
            phFileSize: (ulong)(contentCode.FileOffset + contentCode.FileSize),
            alignment: 0x10000 // TODO: calculate?
        ));
        outputFile.Set(PhDataName, ProgramHeader.CreateProgramHeaderData(
            segmentName: PhDataName,
            offset: (ulong)contentData.FileOffset,
            address: dataSection.Address,
            phFileSize: dataSection.Size,
            alignment: 0x10000 // TODO: calculate?
        ));

        var elfHeader = new ElfHeader(
            segmentName: ElfHeaderName,
            endianness: ElfEndianness.Little, // TODO: support big-endian
            instructionSet: options.InstructionSet,
            entryPoint: codeSection.Address,
            programHeaderOffset: (ulong)nullProgramHeader.FileOffset,
            sectionHeaderOffset: (ulong)sectionHeader.FileOffset,
            programHeaderCount: 3, // TODO: calculate?
            sectionHeaderCount: 4, // TODO: calculate?
            sectionNameIndex: 3 // TODO: calculate?
        );
        outputFile.Set(ElfHeaderName, elfHeader);

        using var file = new BinaryStream(
            File.Open(options.OutputPath, FileMode.Create, FileAccess.Write),
            elfHeader.Endianness == ElfEndianness.Little);

        outputFile.WriteTo(file);
    }
}
```

It creates placeholders for the ELF Header and Program Headers, then creates segments for code and data, and, then creates Section Headers. And only after that when almost the entire file is ready, it goes back and creates the correct ELF Header and Program Headers.

Here is the whole code combined:

<details>
<summary>Source Code</summary>

```csharp
internal interface ISegment
{
    string SegmentName { get; }
    long FileOffset { get; set; }
    long FileSize { get; }

    void WriteTo(BinaryStream stream);
}

internal class OutputFile
{
    private readonly List<ISegment> segments;

    public OutputFile()
        => segments = [];

    public void Add(ISegment segment)
    {
        var lastSegment = segments.LastOrDefault();
        var lastSegmentOffset = lastSegment?.FileOffset ?? 0;
        var lastSegmentSize = lastSegment?.FileSize ?? 0;
        var segmentOffset = lastSegmentOffset + lastSegmentSize;
        segment.FileOffset = segmentOffset;

        segments.Add(segment);
    }

    public void Set(string name, ISegment segment)
    {
        var index = segments.FindIndex(x => x.SegmentName == name);
        if (index < 0)
            throw new InvalidOperationException($"Segment {name} does not exist");

        var existing = segments[index];
        if (segment.FileSize != existing.FileSize)
            throw new InvalidOperationException("Cannot set segment with different offset or size");

        segment.FileOffset = existing.FileOffset;

        segments[index] = segment;
    }

    public void WriteTo(BinaryStream stream)
    {
        foreach (var segment in Segments)
        {
            stream.Seek(segment.FileOffset, SeekOrigin.Begin);

            segment.WriteTo(stream);
        }
    }

    public IReadOnlyList<ISegment> Segments
        => segments;
}

internal class NullSegment : ISegment
{
    public NullSegment(string name, long fileSize) : this(name, 0, fileSize)
    {
    }

    public NullSegment(string name, long fileOffset, long fileSize)
    {
        FileOffset = fileOffset;
        FileSize = fileSize;
        SegmentName = name;
    }

    public void WriteTo(BinaryStream stream)
        => stream.Write(new byte[FileSize]);

    public string SegmentName { get; }

    public long FileOffset { get; set; }

    public long FileSize { get; }
}

internal class DataSegment : ISegment
{
    public DataSegment(string name, byte[] data) : this(name, 0, data)
    {
    }

    public DataSegment(string name, long fileOffset, byte[] data)
    {
        FileOffset = fileOffset;
        FileSize = data.Length;
        Data = data;
        SegmentName = name;
    }

    public void WriteTo(BinaryStream stream)
        => stream.Write(Data);

    public string SegmentName { get; }

    public long FileOffset { get; set; }

    public long FileSize { get; }

    public byte[] Data { get; }
}

internal class StringSegment : ISegment
{
    private readonly List<string> strings;

    public StringSegment(string segmentName) : this(segmentName, 0)
    {
    }

    public StringSegment(string segmentName, long fileOffset)
    {
        strings = [];

        SegmentName = segmentName;
        FileOffset = fileOffset;
        FileSize = 1;
    }

    public long Add(string s)
    {
        strings.Add(s);

        var offset = FileSize;
        FileSize += Encoding.ASCII.GetByteCount(s) + 1;

        return offset;
    }

    public void WriteTo(BinaryStream stream)
    {
        stream.Write(0x00);

        foreach (var s in strings)
        {
            stream.Write(Encoding.UTF8.GetBytes(s));
            stream.Write(0x00);
        }
    }

    public string SegmentName { get; }

    public long FileOffset { get; set; }

    public long FileSize { get; private set; }
}

internal class SectionHeader : ISegment
{
    public SectionHeader(
        string segmentName,
        uint nameOffset,
        SectionHeaderType type,
        SectionHeaderFlags flags,
        ulong address,
        ulong offset,
        ulong size,
        uint link,
        uint info,
        ulong addressAlignment,
        ulong entrySize)
    {
        if (addressAlignment != 0 && address % addressAlignment != 0)
            throw new ArgumentException("Address must be aligned to address alignment");

        SegmentName = segmentName;
        FileOffset = 0;
        FileSize = ElfHeader.ShSize;

        NameOffset = nameOffset;
        Type = type;
        Flags = flags;
        Address = address;
        Offset = offset;
        Size = size;
        Link = link;
        Info = info;
        AddressAlignment = addressAlignment;
        EntrySize = entrySize;
    }

    public static SectionHeader CreateNullSection(string segmentName)
        => new SectionHeader(
            segmentName: segmentName,
            nameOffset: 0,
            type: SectionHeaderType.Null,
            flags: SectionHeaderFlags.None,
            address: 0,
            offset: 0,
            size: 0,
            link: 0,
            info: 0,
            addressAlignment: 0,
            entrySize: 0);

    public static SectionHeader CreateProgBits(
        string segmentName,
        uint nameOffset,
        ulong address,
        ulong offset,
        ulong size,
        ulong alignment)
        => new SectionHeader(
            segmentName: segmentName,
            nameOffset: nameOffset,
            type: SectionHeaderType.ProgramData,
            flags: SectionHeaderFlags.Alloc | SectionHeaderFlags.Executable,
            address: address,
            offset: offset,
            size: size,
            link: 0,
            info: 0,
            addressAlignment: alignment,
            entrySize: 0);

    public static SectionHeader CreateData(
        string segmentName,
        uint nameOffset,
        ulong address,
        ulong offset,
        ulong size,
        ulong alignment)
        => new SectionHeader(
            segmentName: segmentName,
            nameOffset: nameOffset,
            type: SectionHeaderType.ProgramData,
            flags: SectionHeaderFlags.Alloc | SectionHeaderFlags.Writable,
            address: address,
            offset: offset,
            size: size,
            link: 0,
            info: 0,
            addressAlignment: alignment,
            entrySize: 0);

    public static SectionHeader CreateShStrTab(
        string segmentName,
        uint nameOffset,
        ulong offset,
        ulong size)
        => new SectionHeader(
            segmentName,
            nameOffset,
            SectionHeaderType.StringTable,
            SectionHeaderFlags.None,
            0,
            offset,
            size,
            0,
            0,
            1,
            0);

    public void WriteTo(BinaryStream stream)
    {
        stream.Write(NameOffset);
        stream.Write((uint)Type);
        stream.Write((ulong)Flags);
        stream.Write(Address);
        stream.Write(Offset);
        stream.Write(Size);
        stream.Write(Link);
        stream.Write(Info);
        stream.Write(AddressAlignment);
        stream.Write(EntrySize);
    }

    public string SegmentName { get; }

    public long FileOffset { get; set; }

    public long FileSize { get; }

    public uint NameOffset { get; }

    public SectionHeaderType Type { get; }

    public SectionHeaderFlags Flags { get; }

    public ulong Address { get; }

    public ulong Offset { get; }

    public ulong Size { get; }

    public uint Link { get; }

    public uint Info { get; }

    public ulong AddressAlignment { get; }

    public ulong EntrySize { get; }
}

internal class ProgramHeader : ISegment
{
    private ProgramHeader(
        string segmentName,
        ProgramHeaderType type,
        ProgramHeaderFlags flags,
        ulong offset,
        ulong virtualAddress,
        ulong physicalAddress,
        ulong phFileSize,
        ulong memorySize,
        ulong alignment)
    {
        const ulong pageSize = 0x1000;
        if (virtualAddress % pageSize != offset % pageSize)
            throw new ArgumentException("Virtual address must be aligned to page size");

        if (alignment != 0 && virtualAddress % alignment != offset % alignment)
            throw new ArgumentException("Virtual address must be aligned to alignment");

        SegmentName = segmentName;
        FileOffset = 0;
        FileSize = ElfHeader.PhSize;

        Type = type;
        Flags = flags;
        Offset = offset;
        VirtualAddress = virtualAddress;
        PhysicalAddress = physicalAddress;
        PhFileSize = phFileSize;
        MemorySize = memorySize;
        Alignment = alignment;
    }

    public static ProgramHeader CreateProgramHeader(
        string segmentName,
        ulong offset,
        ulong address,
        ulong phFileSize,
        ulong alignment)
        => new ProgramHeader(
            segmentName: segmentName,
            type: ProgramHeaderType.ProgramHeader,
            flags: ProgramHeaderFlags.Read,
            offset: offset,
            virtualAddress: address,
            physicalAddress: address,
            phFileSize: phFileSize,
            memorySize: phFileSize,
            alignment: alignment);

    public static ProgramHeader CreateProgramHeaderCode(
        string segmentName,
        ulong offset,
        ulong address,
        ulong phFileSize,
        ulong alignment)
        => new ProgramHeader(
            segmentName: segmentName,
            type: ProgramHeaderType.Load,
            flags: ProgramHeaderFlags.Read | ProgramHeaderFlags.Execute,
            offset: offset,
            virtualAddress: address,
            physicalAddress: address,
            phFileSize: phFileSize,
            memorySize: phFileSize,
            alignment: alignment);

    public static ProgramHeader CreateProgramHeaderData(
        string segmentName,
        ulong offset,
        ulong address,
        ulong phFileSize,
        ulong alignment)
        => new ProgramHeader(
            segmentName: segmentName,
            type: ProgramHeaderType.Load,
            flags: ProgramHeaderFlags.Read | ProgramHeaderFlags.Write,
            offset: offset,
            virtualAddress: address,
            physicalAddress: address,
            phFileSize: phFileSize,
            memorySize: phFileSize,
            alignment: alignment);

    public void WriteTo(BinaryStream stream)
    {
        stream.Write((uint)Type);
        stream.Write((uint)Flags);
        stream.Write(Offset);
        stream.Write(VirtualAddress);
        stream.Write(PhysicalAddress);
        stream.Write(PhFileSize);
        stream.Write(MemorySize);
        stream.Write(Alignment);
    }

    public string SegmentName { get; }

    public long FileOffset { get; set; }

    public long FileSize { get; }

    public ProgramHeaderType Type { get; }

    public ProgramHeaderFlags Flags { get; }

    public ulong Offset { get; }

    public ulong VirtualAddress { get; }

    public ulong PhysicalAddress { get; }

    public ulong PhFileSize { get; }

    public ulong MemorySize { get; }

    public ulong Alignment { get; }
}

internal class ElfWriter
{
    private const string ElfHeaderName = "ELF Header";
    private const string ProgramHeaderName = "Program Header";
    private const string PhCodeName = "PH Code";
    private const string PhDataName = "PH Data";
    private const string ContentCodeName = "Content Code";
    private const string ContentDataName = "Content Data";
    private const string ContentShStrTabName = "Content Shstrtab";
    private const string ShNullName = "SH Null";
    private const string ShTextName = "SH Text";
    private const string ShDataName = "SH Text";
    private const string ShShStrTabName = "SH ShStrTab";

    private const ulong BaseAddress = 0x00400000;

    public void Write(ElfOptions options)
    {
        var outputFile = new OutputFile();

        // add null segments to calculate offsets correctly
        outputFile.Add(new NullSegment(ElfHeaderName, ElfHeader.ElfHeaderSize));

        var nullProgramHeader = new NullSegment(ProgramHeaderName, ElfHeader.PhSize);
        outputFile.Add(nullProgramHeader);
        outputFile.Add(new NullSegment(PhCodeName, ElfHeader.PhSize));
        outputFile.Add(new NullSegment(PhDataName, ElfHeader.PhSize));

        // TODO: replace by code
        var contentCode = new DataSegment(ContentCodeName, [
            0x20, 0x00, 0x80, 0xD2, // mov x0, #1
            0xE1, 0x00, 0x00, 0x58, // mov x1, =msg
            0xC2, 0x01, 0x80, 0xD2, // mov x2, #14
            0x08, 0x08, 0x80, 0xD2, // mov x8, #64
            0x01, 0x00, 0x00, 0xD4, // svc #0

            0x20, 0x00, 0x80, 0xD2, // mov x0, #1
            0xA8, 0x0B, 0x80, 0xD2, // mov x8, #93
            0x01, 0x00, 0x00, 0xD4, // svc #0

            0x10, 0x01, 0x41, 0x00, // address 0x400110
            0x00, 0x00, 0x00, 0x00,
        ]);
        outputFile.Add(contentCode);

        var contentData = new DataSegment(ContentDataName, [
            .."Hello, World!\n"u8, 0x00
        ]);
        outputFile.Add(contentData);

        var shstrtab = new StringSegment(ContentShStrTabName);
        var shstrtabOffset = shstrtab.Add(".shstrtab");
        var textOffset = shstrtab.Add(".text");
        var dataOffset = shstrtab.Add(".data");
        outputFile.Add(shstrtab);

        // add section headers
        var sectionHeader = SectionHeader.CreateNullSection(ShNullName);
        outputFile.Add(sectionHeader);
        var codeSection = SectionHeader.CreateProgBits(
            segmentName: ShTextName,
            nameOffset: (uint)textOffset,
            address: BaseAddress + (ulong)contentCode.FileOffset,
            offset: (ulong)contentCode.FileOffset,
            size: (ulong)contentCode.FileSize,
            alignment: 8);
        outputFile.Add(codeSection);
        var dataSection = SectionHeader.CreateData(
            segmentName: ShDataName,
            nameOffset: (uint)dataOffset,
            address: BaseAddress + 0x10000 + (ulong)contentData.FileOffset,
            offset: (ulong)contentData.FileOffset,
            size: (ulong)contentData.FileSize,
            alignment: 1);
        outputFile.Add(dataSection);
        outputFile.Add(SectionHeader.CreateShStrTab(
            segmentName: ShShStrTabName,
            nameOffset: (uint)shstrtabOffset,
            offset: (ulong)shstrtab.FileOffset,
            size: (ulong)shstrtab.FileSize));

        // populate null segments
        outputFile.Set(ProgramHeaderName, ProgramHeader.CreateProgramHeader(
            segmentName: ProgramHeaderName,
            offset: (ulong)nullProgramHeader.FileOffset,
            address: BaseAddress + (ulong)nullProgramHeader.FileOffset,
            phFileSize: 3 * ElfHeader.PhSize, // TODO: calculate?
            alignment: 0
        ));
        outputFile.Set(PhCodeName, ProgramHeader.CreateProgramHeaderCode(
            segmentName: PhCodeName,
            offset: 0,
            address: BaseAddress,
            phFileSize: (ulong)(contentCode.FileOffset + contentCode.FileSize),
            alignment: 0x10000 // TODO: calculate?
        ));
        outputFile.Set(PhDataName, ProgramHeader.CreateProgramHeaderData(
            segmentName: PhDataName,
            offset: (ulong)contentData.FileOffset,
            address: dataSection.Address,
            phFileSize: dataSection.Size,
            alignment: 0x10000 // TODO: calculate?
        ));

        var elfHeader = new ElfHeader(
            segmentName: ElfHeaderName,
            endianness: ElfEndianness.Little, // TODO: support big-endian
            instructionSet: options.InstructionSet,
            entryPoint: codeSection.Address,
            programHeaderOffset: (ulong)nullProgramHeader.FileOffset,
            sectionHeaderOffset: (ulong)sectionHeader.FileOffset,
            programHeaderCount: 3, // TODO: calculate?
            sectionHeaderCount: 4, // TODO: calculate?
            sectionNameIndex: 3 // TODO: calculate?
        );
        outputFile.Set(ElfHeaderName, elfHeader);

        using var file = new BinaryStream(
            File.Open(options.OutputPath, FileMode.Create, FileAccess.Write),
            elfHeader.Endianness == ElfEndianness.Little);

        outputFile.WriteTo(file);
    }
}
```

More at [GitHub](https://github.com/trilang/trilang).

</details>

This is not the final version to generate any ELF file. It still has a lot of hardcoded stuff and it is strictly designed to create a specific ELF file. But it is a good starting point to understand how it works. For example, the "Hello, World" string could be in a read-only section of memory. Or the amount of sections should be calculated instead of hardcoded.

# Pitfalls

First of all, you have to be careful with field sizes and offsets. It is easy to make a mistake and write some field as 32-bit interger instead of 64-bits.

The program header table (`PT_PHDR`) should be mapped to a loadable segment, otherwise `readelf` will output the following error: "PHDR segment not covered by LOAD segment". Initially, I created an elf file where `PT_PHDR` is not loaded into memory by any Program Header. There was only one loadable segment with code and it pointed directly at the beginning of the code (the first instruction). And the fix is quite simple. Instead of adding file offsets to the program header, just use 0 and load a file from the very beginning including the ELF header. This way the `PT_PHDR` header will be included. But because your code segment will have more data, you also need to correct all addresses. For example, the address of the program's entry point.

In the previous section, I mentioned that there are some restrictions for Address, Offset, or Alignment fields. And it is pretty important because otherwise, the OS will just crash your application with the Segmentation Fault error. In some cases, your application will be loaded incorrectly in memory or into a section with wrong permissions (the code section without the `Executable` permission).

ARM has the fixed size instructions - 32-bits. So, if you want to call a function and pass an address like in the example above (syscall to print the message), you can't do it directly. Because addresses are 64-bits long obviously you won't be able to encode 64-bits in 32-bits. But there is a workaround. The ARM supports several addressing modes and one of them allows the calculation of the address as an offset from the current instruction. Usually, compilers/disassemblers display such commands as `ldr x0, =msg` which means loading the address of the `msg` variable into `x0`. But in fact it is `ldr x0, [pc, #offset]`. The `pc` register is Program Counter - a pointer (address) to the current instruction. This way we can calculate the address without a message but there are some limitations and compilers are making an additional step. Instead of calculating the address directly, they put the address into some memory segment (usually at the end of your code, to be close to the current instruction) and use the `ldr` instruction to point to this memory segment. So, `ldr x0, =msg` actually doesn't point to `msg` but instead it point to a memory where the address of `msg` is stored and the CPU can load 64-bit address easily.

# Conclusion

# Sources

- [Executable and Linkable Format](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format)
- [ELF Hello World Tutorial](https://cirosantilli.com/elf-hello-world)
- [System V Application Binary Interface](https://www.sco.com/developers/devspecs/gabi41.pdf)