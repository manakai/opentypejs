// The `cmap` table stores the mappings from characters to glyphs.
// https://www.microsoft.com/typography/OTSPEC/cmap.htm

import check from '../check';
import parse from '../parse';
import table from '../table';

function parseCmapTableFormat12(cmap, p, subtable) {
    //Skip reserved.
    p.parseUShort();

    // Length in bytes of the sub-tables.
    subtable.length = cmap.length = p.parseULong();
    subtable.language = cmap.language = p.parseULong();

    let groupCount;
    subtable.groupCount = cmap.groupCount = groupCount = p.parseULong();
    subtable.glyphIndexMap = cmap.glyphIndexMap = {};

    for (let i = 0; i < groupCount; i += 1) {
        const startCharCode = p.parseULong();
        const endCharCode = p.parseULong();
        let startGlyphId = p.parseULong();

        for (let c = startCharCode; c <= endCharCode; c += 1) {
            cmap.glyphIndexMap[c] = startGlyphId;
            startGlyphId++;
        }
    }
}

function parseCmapTableFormat13(cmap, p, subtable) {
    //Skip reserved.
    p.parseUShort();

    // Length in bytes of the sub-tables.
    subtable.length = cmap.length = p.parseULong();
    subtable.language = cmap.language = p.parseULong();

    let groupCount;
    subtable.groupCount = cmap.groupCount = groupCount = p.parseULong();
    subtable.glyphIndexMap = cmap.glyphIndexMap = {};

    for (let i = 0; i < groupCount; i += 1) {
        const startCharCode = p.parseULong();
        const endCharCode = p.parseULong();
        let startGlyphId = p.parseULong();

        for (let c = startCharCode; c <= endCharCode; c += 1) {
            cmap.glyphIndexMap[c] = startGlyphId;
        }
    }
}

function parseCmapTableFormat4(cmap, p, subtable, data, offset) {
    // Length in bytes of the sub-tables.
    subtable.length = cmap.length = p.parseUShort();
    subtable.language = cmap.language = p.parseUShort();

    // segCount is stored x 2.
    let segCount;
    subtable.segCount = cmap.segCount = segCount = p.parseUShort() >> 1;

    // Skip searchRange, entrySelector, rangeShift.
    p.skip('uShort', 3);

    // The "unrolled" mapping from character codes to glyph indices.
    subtable.glyphIndexMap = cmap.glyphIndexMap = {};
    const endCountParser = new parse.Parser(data, offset + 14);
    const startCountParser = new parse.Parser(data, offset + 16 + segCount * 2);
    const idDeltaParser = new parse.Parser(data, offset + 16 + segCount * 4);
    const idRangeOffsetParser = new parse.Parser(data, offset + 16 + segCount * 6);
    let glyphIndexOffset = offset + 16 + segCount * 8;
    for (let i = 0; i < segCount - 1; i += 1) {
        let glyphIndex;
        const endCount = endCountParser.parseUShort();
        const startCount = startCountParser.parseUShort();
        const idDelta = idDeltaParser.parseShort();
        const idRangeOffset = idRangeOffsetParser.parseUShort();
        for (let c = startCount; c <= endCount; c += 1) {
            if (idRangeOffset !== 0) {
                // The idRangeOffset is relative to the current position in the idRangeOffset array.
                // Take the current offset in the idRangeOffset array.
                glyphIndexOffset = (idRangeOffsetParser.offset + idRangeOffsetParser.relativeOffset - 2);

                // Add the value of the idRangeOffset, which will move us into the glyphIndex array.
                glyphIndexOffset += idRangeOffset;

                // Then add the character index of the current segment, multiplied by 2 for USHORTs.
                glyphIndexOffset += (c - startCount) * 2;
                glyphIndex = parse.getUShort(data, glyphIndexOffset);
                if (glyphIndex !== 0) {
                    glyphIndex = (glyphIndex + idDelta) & 0xFFFF;
                }
            } else {
                glyphIndex = (c + idDelta) & 0xFFFF;
            }

            cmap.glyphIndexMap[c] = glyphIndex;
        }
    }
}

function parseCmapTableFormat14(p, subtable) {
    // Length in bytes of the sub-tables.
    subtable.length = p.parseULong();

    let groupCount;
    subtable.numVarSelectorRecords = groupCount = p.parseULong();
    subtable.varGlyphIndexMap = {};

    for (let i = 0; i < groupCount; i += 1) {
        const varSelector = p.parseUint24();
        const indexMap = {};
        subtable.varGlyphIndexMap[varSelector] = indexMap;

        const defaultUVSOffset = p.parseOffset32();
        if (defaultUVSOffset !== 0) {
            const defaultUVSParser = new parse.Parser(subtable._data, subtable._offset + defaultUVSOffset);
            const numUnicodeValueRanges = defaultUVSParser.parseULong();
            for (let j = 0; j < numUnicodeValueRanges; j += 1) {
                const startUnicodeValue = defaultUVSParser.parseUint24();
                const additionalCount = defaultUVSParser.parseByte();
                for (let delta = 0; delta <= additionalCount; delta += 1) {
                    // same as glyphIndexMap[startUnicodeValue + delta]
                    indexMap[startUnicodeValue + delta] = -1;
                }
            }
        }

        const nonDefaultUVSOffset = p.parseOffset32();
        if (nonDefaultUVSOffset !== 0) {
            const nonDefaultUVSParser = new parse.Parser(subtable._data, subtable._offset + nonDefaultUVSOffset);
            const numUVSMappings = nonDefaultUVSParser.parseULong();
            for (let j = 0; j < numUVSMappings; j += 1) {
                const unicodeValue = nonDefaultUVSParser.parseUint24();
                const glyphID = nonDefaultUVSParser.parseUShort();
                indexMap[unicodeValue] = glyphID;
            }
        }
    }
}

function parseCmapTableFormat6(p, subtable) {
    // Length in bytes of the sub-tables.
    subtable.length = p.parseULong();
    subtable.language = p.parseUShort();

    subtable.glyphIndexMap = [];

    let firstCode = p.parseUShort();
    let entryCount = p.parseUShort();
    let lastCode = firstCode + entryCount;
    for (let c = firstCode; c <= lastCode; c += 1) {
        subtable.glyphIndexMap[c] = p.parseUShort();
    }
}

function parseCmapTableFormat0(p, subtable) {
    // Length in bytes of the sub-tables.
    subtable.length = p.parseULong();
    subtable.language = p.parseUShort();

    subtable.glyphIndexMap = p.parseList(256, function() {
        return this.parseByte();
    });
}

// Parse the `cmap` table. This table stores the mappings from characters to glyphs.
// There are many available formats, but we only support the Windows format 4 and 12.
// This function returns a `CmapEncoding` object or null if no supported format could be found.
function parseCmapTable(data, start) {
    const cmap = {};
    cmap.version = parse.getUShort(data, start);
    check.argument(cmap.version === 0, 'cmap table version should be 0.');

    // The cmap table can contain many sub-tables, each with their own format.
    // We're only interested in a "platform 0" (Unicode format) and "platform 3" (Windows format) table.
    cmap.numTables = parse.getUShort(data, start + 2);
    cmap.subtables = [];
    let selectedSubtable;
    for (let i = cmap.numTables - 1; i >= 0; i -= 1) {
        const platformID = parse.getUShort(data, start + 4 + (i * 8));
        const encodingID = parse.getUShort(data, start + 4 + (i * 8) + 2);
        const tableOffset = parse.getULong(data, start + 4 + (i * 8) + 4);
        let subtable = new CmapSubtable(platformID, encodingID, data, start + tableOffset);
        cmap.subtables.push(subtable);

        const p = new parse.Parser(data, start + tableOffset);
        subtable.format = p.parseUShort();

        if (!selectedSubtable) {
            if ((platformID === 3 && (encodingID === 0 || encodingID === 1 || encodingID === 10)) ||
                (platformID === 0 && (encodingID === 0 || encodingID === 1 || encodingID === 2 || encodingID === 3 || encodingID === 4))) {
                selectedSubtable = subtable;
                cmap.format = subtable.format;
            }
        }
    }

    if (!selectedSubtable) {
        // There is no cmap table in the font that we support.
        throw new Error('No valid cmap sub-tables found.');
    }

    var parsed = selectedSubtable.parse(cmap);
    if (!parsed) throw new Error('Only format 4 and 12 cmap tables are supported (found format ' + cmap.format + ').');

    return cmap;
}

function addSegment(segments, code, glyphIndex) {
    segments.push({
        end: code,
        start: code,
        delta: -(code - glyphIndex),
        offset: 0,
        glyphIndex: glyphIndex
    });
}

function addTerminatorSegment(t) {
    t.segments.push({
        end: 0xFFFF,
        start: 0xFFFF,
        delta: 1,
        offset: 0
    });
}

// Make cmap table, format 4 by default, 12 if needed only
function makeCmapTable(glyphs) {
    // Plan 0 is the base Unicode Plan but emojis, for example are on another plan, and needs cmap 12 format (with 32bit)
    let isPlan0Only = true;
    let i;

    let segments = [];
    let vsMappings = {};
    let hasVS = false;
    let ranges = [];
    // Check if we need to add cmap format 12 or if format 4 only is fine
    for (i = 0; i < glyphs.length; i += 1) {
        const glyph = glyphs.get(i);
        for (let j = 0; j < glyph.unicodes.length; j += 1) {
            addSegment(segments, glyph.unicodes[j], i);
            if (isPlan0Only && glyph.unicodes[j] > 0xFFFF) {
                console.log('Adding CMAP format 12 (needed!)');
                isPlan0Only = false;
            }
        }
        for (let j = 0; j < glyph.vses.length; j += 1) {
            let vs = glyph.vses[j];
            if (!vsMappings[vs[1]]) vsMappings[vs[1]] = {};
            vsMappings[vs[1]][vs[0]] = i;
            hasVS = true;
        }
        if (glyph.unicodeRanges) {
            for (let j = 0; j < glyph.unicodeRanges.length; j++) {
                ranges.push([glyph.unicodeRanges[j], i]);
            }
        }
    }
    // Format 12 subtable is effectively required for large fonts and is
    // redundant but small enough for other fonts.
    if (!ranges.length && glyphs.length > 1000) isPlan0Only = false;

    let nextOffset = 12 + (isPlan0Only ? 0 : 8) + (hasVS ? 8 : 0) + (ranges.length ? 8 : 0);
    let cmapTable = [
        {name: 'version', type: 'USHORT', value: 0},
        {name: 'numTables', type: 'USHORT', value: 1 + (isPlan0Only ? 0 : 1) + (hasVS ? 1 : 0) + (ranges.length ? 1 : 0)},

        // CMAP 4 header
        {name: 'platformID', type: 'USHORT', value: 3},
        {name: 'encodingID', type: 'USHORT', value: 1},
        {name: 'offset', type: 'ULONG', value: nextOffset},
    ];

    if (!isPlan0Only)
        cmapTable = cmapTable.concat([
            // CMAP 12 header
            {name: 'cmap12PlatformID', type: 'USHORT', value: 3}, // We encode only for PlatformID = 3 (Windows) because it is supported everywhere
            {name: 'cmap12EncodingID', type: 'USHORT', value: 10},
            {name: 'cmap12Offset', type: 'ULONG', value: 0}
        ]);

    if (ranges.length)
        cmapTable = cmapTable.concat([
            {name: 'cmap13PlatformID', type: 'USHORT', value: 3},
            {name: 'cmap13EncodingID', type: 'USHORT', value: 10},
            {name: 'cmap13Offset', type: 'ULONG', value: 0}
        ]);

    if (hasVS)
        cmapTable = cmapTable.concat([
            {name: 'cmap14PlatformID', type: 'USHORT', value: 0},
            {name: 'cmap14EncodingID', type: 'USHORT', value: 5},
            {name: 'cmap14Offset', type: 'ULONG', value: 0}
        ]);

    cmapTable = cmapTable.concat([
        // CMAP 4 Subtable
        {name: 'format', type: 'USHORT', value: 4},
        {name: 'cmap4Length', type: 'USHORT', value: 0},
        {name: 'language', type: 'USHORT', value: 0},
        {name: 'segCountX2', type: 'USHORT', value: 0},
        {name: 'searchRange', type: 'USHORT', value: 0},
        {name: 'entrySelector', type: 'USHORT', value: 0},
        {name: 'rangeShift', type: 'USHORT', value: 0}
    ]);

    const t = new table.Table('cmap', cmapTable);

    t.segments = segments.sort(function (a, b) {
        return a.start - b.start;
    });
    addTerminatorSegment(t);

    const segCount = t.segments.length;
    let segCountToRemove = 0;

    // CMAP 4
    // Set up parallel segment arrays.
    let endCounts = [];
    let startCounts = [];
    let idDeltas = [];
    let idRangeOffsets = [];
    let glyphIds = [];
    let cmap4Length = 16; // Subtable header + reservedPad
    let cmap4IsFull = false;

    // CMAP 12
    let cmap12Groups = [];

    // Reminder this loop is not following the specification at 100%
    // The specification -> find suites of characters and make a group
    // Here we're doing one group for each letter
    // Doing as the spec can save 8 times (or more) space
    for (i = 0; i < segCount; i += 1) {
        const segment = t.segments[i];

        // CMAP 4
        if (segment.end <= 65535 && segment.start <= 65535 &&
            (!cmap4IsFull || segment.glyphIndex === undefined)) {
            endCounts = endCounts.concat({name: 'end_' + i, type: 'USHORT', value: segment.end});
            startCounts = startCounts.concat({name: 'start_' + i, type: 'USHORT', value: segment.start});
            idDeltas = idDeltas.concat({name: 'idDelta_' + i, type: 'SHORT', value: segment.delta});
            idRangeOffsets = idRangeOffsets.concat({name: 'idRangeOffset_' + i, type: 'USHORT', value: segment.offset});
            cmap4Length += 4 * 2;
            if (segment.glyphId !== undefined) {
                glyphIds = glyphIds.concat({name: 'glyph_' + i, type: 'USHORT', value: segment.glyphId});
                cmap4Length += 2;
            }
            cmap4IsFull = cmap4Length + 5 * 2 * 2 > 2**16 - 1;
        } else {
            // Skip Unicode > 65535 (16bit unsigned max) for CMAP 4, will be added in CMAP 12
            segCountToRemove += 1;
        }

        // CMAP 12
        // Skip Terminator Segment
        if (!isPlan0Only && segment.glyphIndex !== undefined) {
            let v = new table.Record('cmap12 value', [
                {name: 'start', type: 'ULONG', value: segment.start},
                {name: 'end', type: 'ULONG', value: segment.end},
                {name: 'glyph', type: 'ULONG', value: segment.glyphIndex},
            ]);
            cmap12Groups.push(v.encode());
        }
    }

    // CMAP 4 Subtable
    t.segCountX2 = (segCount - segCountToRemove) * 2;
    t.searchRange = Math.pow(2, Math.floor(Math.log((segCount - segCountToRemove)) / Math.log(2))) * 2;
    t.entrySelector = Math.log(t.searchRange / 2) / Math.log(2);
    t.rangeShift = t.segCountX2 - t.searchRange;

    t.fields = t.fields.concat(endCounts);
    t.fields.push({name: 'reservedPad', type: 'USHORT', value: 0});
    t.fields = t.fields.concat(startCounts);
    t.fields = t.fields.concat(idDeltas);
    t.fields = t.fields.concat(idRangeOffsets);
    t.fields = t.fields.concat(glyphIds);

    if (cmap4Length > 2**16 - 1) throw new Error('Overflow of cmap4Length (' + cmap4Length + ')');
    t.cmap4Length = cmap4Length;
    nextOffset += cmap4Length;

    if (!isPlan0Only) {
        // CMAP 12 Subtable
        const cmap12MainLength = cmap12Groups.length * 3 * 4;
        const cmap12Length = 16 + cmap12MainLength;

        const ab = new ArrayBuffer(cmap12MainLength);
        const a8 = new Uint8Array(ab);
        let x = 0;
        for (let i = 0; i < cmap12Groups.length; i++) {
            for (let j = 0; j < cmap12Groups[i].length; j++) {
                a8[x++] = cmap12Groups[i][j];
            }
        }

        t.cmap12Offset = nextOffset;
        t.fields = t.fields.concat([
            {name: 'cmap12Format', type: 'USHORT', value: 12},
            {name: 'cmap12Reserved', type: 'USHORT', value: 0},
            {name: 'cmap12Length', type: 'ULONG', value: cmap12Length},
            {name: 'cmap12Language', type: 'ULONG', value: 0},
            {name: 'cmap12nGroups', type: 'ULONG', value: cmap12Groups.length},
            {name: 'cmap12Main', type: 'LITERAL', value: a8}
        ]);

        nextOffset += cmap12Length;
    }

    if (ranges.length) {
        let cmap13Length = 2 + 2 + 4 + 4 + 4 + (4 + 4 + 4) * ranges.length;

        t.fields = t.fields.concat([
            {name: 'cmap13Format', type: 'USHORT', value: 13},
            {name: 'cmap13Reserved', type: 'USHORT', value: 0},
            {name: 'cmap13Length', type: 'ULONG', value: cmap13Length},
            {name: 'cmap13Language', type: 'ULONG', value: 0},
            {name: 'cmap13NumGroups', type: 'ULONG', value: ranges.length},
        ]);
        t.cmap13Offset = nextOffset;

        let i = 0;
        ranges.sort(function (a, b) {
            return a[0][0] - b[0][0];
        }).forEach(function (range) {
            t.fields = t.fields.concat([
                {name: 'cmap13StartCharCode_' + i, type: 'ULONG', value: range[0][0]},
                {name: 'cmap13EndCharCode_' + i, type: 'ULONG', value: range[0][1]},
                {name: 'cmap13GlyphID_' + i, type: 'ULONG', value: range[1]},
            ]);
            i++;
        });
        nextOffset += cmap13Length;
    }

    if (hasVS) {
        // CMAP 14 Subtable
        let cmap14Length = 2 + 4 + 4; // Subtable header

        t.fields = t.fields.concat([
            {name: 'cmap14Format', type: 'USHORT', value: 14},
            {name: 'cmap14Length', type: 'ULONG', value: cmap14Length},
            {name: 'cmap14NumVarSelectorRecords', type: 'ULONG', value: 0},
        ]);
        t.cmap14Offset = nextOffset;

        let j = 0;
        let nonDefaultUVSRecords = [];
        let uvsNextRecordOffset = 0;
        let uvsOffsetFields = [];
        Object.keys(vsMappings).sort(function (a, b) {
            return a - b;
        }).forEach(function (unicode2) {
            let uvsOffset = {name: 'cmap14NonDefaultUVSOffset_' + j, type: 'ULONG', value: uvsNextRecordOffset};
            uvsOffsetFields.push(uvsOffset);
            t.fields = t.fields.concat([
                {name: 'cmap14VarSelector_' + j, type: 'UINT24', value: parseInt(unicode2)},
                {name: 'cmap14DefaultUVSOffset_' + j, type: 'ULONG', value: 0},
                uvsOffset,
            ]);
            let k = 0;
            let uvsMappings = [
                {name: 'cmap14NumUVSMappings_' + j, type: 'ULONG', value: 0},
            ];
            uvsNextRecordOffset += 4;
            Object.keys(vsMappings[unicode2]).sort(function (a, b) {
                return a - b;
            }).forEach(function (unicode1) {
                uvsMappings.push(
                    {name: 'cmap14UnicodeValue_' + j + '_' + k, type: 'UINT24', value: parseInt(unicode1)},
                    {name: 'cmap14GlyphID_' + j + '_' + k, type: 'USHORT', value: vsMappings[unicode2][unicode1]},
                );
                k++;
                uvsNextRecordOffset += 3 + 2;
            });
            uvsMappings[0].value = k;
            nonDefaultUVSRecords = nonDefaultUVSRecords.concat(uvsMappings);
            j++;
        });
        t.cmap14NumVarSelectorRecords = j;
        cmap14Length += (3 + 4 + 4) * j;
        t.cmap14Length = cmap14Length + uvsNextRecordOffset;

        t.fields = t.fields.concat(nonDefaultUVSRecords);
        uvsOffsetFields.forEach(function (field) {
            field.value += cmap14Length;
        });
        nextOffset += cmap14Length + uvsNextRecordOffset;
    }

    return t;
}

function CmapSubtable(platformID, encodingID, data, offset) {
    this.platformID = platformID;
    this.encodingID = encodingID;
    this._data = data;
    this._offset = offset;
}

CmapSubtable.prototype.parse = function(cmap) {
    if (!cmap) cmap = {};

    const p = new parse.Parser(this._data, this._offset);
    p.parseUShort(); // format

    if (this.format === 12) {
        parseCmapTableFormat12(cmap, p, this);
    } else if (this.format === 4) {
        parseCmapTableFormat4(cmap, p, this, this._data, this._offset);
    } else if (this.format === 14) {
        parseCmapTableFormat14(p, this);
    } else if (this.format === 6) {
        parseCmapTableFormat6(p, this);
    } else if (this.format === 0) {
        parseCmapTableFormat0(p, this);
    } else if (this.format === 13) {
        parseCmapTableFormat13(cmap, p, this);
    } else {
        return false;
    }
    return true;
};

export default { parse: parseCmapTable, make: makeCmapTable };
