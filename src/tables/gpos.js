// The `GPOS` table contains kerning pairs, among other things.
// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos

import check from '../check';
import { Parser } from '../parse';
import table from '../table';

const subtableParsers = new Array(10);         // subtableParsers[0] is unused

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#lookup-type-1-single-adjustment-positioning-subtable
// this = Parser instance
subtableParsers[1] = function parseLookup1() {
    const start = this.offset + this.relativeOffset;
    const posformat = this.parseUShort();
    if (posformat === 1) {
        var coverage = this.parsePointer(Parser.coverage);
        var valueFormat = this.parseUShort();
        return {
            posFormat: 1,
            coverage,
            valueFormat,
            value: this.parseValueRecord(valueFormat)
        };
    } else if (posformat === 2) {
        return {
            posFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            values: this.parseValueRecordList()
        };
    }
    check.assert(false, '0x' + start.toString(16) + ': GPOS lookup type 1 format must be 1 or 2.');
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#lookup-type-2-pair-adjustment-positioning-subtable
subtableParsers[2] = function parseLookup2() {
    const start = this.offset + this.relativeOffset;
    const posFormat = this.parseUShort();
    check.assert(posFormat === 1 || posFormat === 2, '0x' + start.toString(16) + ': GPOS lookup type 2 format must be 1 or 2.');
    const coverage = this.parsePointer(Parser.coverage);
    const valueFormat1 = this.parseUShort();
    const valueFormat2 = this.parseUShort();
    if (posFormat === 1) {
        // Adjustments for Glyph Pairs
        return {
            posFormat: posFormat,
            coverage: coverage,
            valueFormat1: valueFormat1,
            valueFormat2: valueFormat2,
            pairSets: this.parseList(Parser.pointer(Parser.list(function() {
                return {        // pairValueRecord
                    secondGlyph: this.parseUShort(),
                    value1: this.parseValueRecord(valueFormat1),
                    value2: this.parseValueRecord(valueFormat2)
                };
            })))
        };
    } else if (posFormat === 2) {
        const classDef1 = this.parsePointer(Parser.classDef);
        const classDef2 = this.parsePointer(Parser.classDef);
        const class1Count = this.parseUShort();
        const class2Count = this.parseUShort();
        return {
            // Class Pair Adjustment
            posFormat: posFormat,
            coverage: coverage,
            valueFormat1: valueFormat1,
            valueFormat2: valueFormat2,
            classDef1: classDef1,
            classDef2: classDef2,
            class1Count: class1Count,
            class2Count: class2Count,
            classRecords: this.parseList(class1Count, Parser.list(class2Count, function() {
                return {
                    value1: this.parseValueRecord(valueFormat1),
                    value2: this.parseValueRecord(valueFormat2)
                };
            }))
        };
    }
};

subtableParsers[3] = function parseLookup3() {
    const start = this.offset + this.relativeOffset;
    const posFormat = this.parseUShort();
    if (posFormat === 1) {
        return {
            posFormat: posFormat,
            coverage: this.parsePointer(Parser.coverage),
            entryExits: this.parseList(this.parseUShort(), function() {
                return {
                    entryAnchor: this.parseAnchor(),
                    exitAnchor: this.parseAnchor(),
                };
            }),
        };
    } else {
        return { error: '0x' + start.toString(16) + ': GPOS lookup type 3 format must be 1.' };
    }
};

subtableParsers[4] = function parseLookup4() {
    const start = this.offset + this.relativeOffset;
    const posFormat = this.parseUShort();
    if (posFormat === 1) {
        let pos = {
            posFormat: posFormat,
            markCoverage: this.parsePointer(Parser.coverage),
            baseCoverage: this.parsePointer(Parser.coverage),
        };
        let markClassCount = pos.markClassCount = this.parseUShort();

        pos.marks = this.parsePointer(function () {
            return this.parseList(this.parseUShort(), function() {
                return {
                    markClass: this.parseUShort(),
                    markAnchor: this.parseAnchor(),
                };
            });
        });
        pos.bases = this.parsePointer(function () {
            return this.parseList(this.parseUShort(), function () {
                return {
                    baseAnchors: this.parseList(markClassCount, function () {
                        return this.parseAnchor();
                    }),
                };
            });
        });
        return pos;
    } else {
        return { error: '0x' + start.toString(16) + ': GPOS lookup type 4 format must be 1 or 2.' };
    }
};

subtableParsers[5] = function parseLookup5() { return { error: 'GPOS Lookup 5 not supported' }; };

subtableParsers[6] = function parseLookup6() {
    const start = this.offset + this.relativeOffset;
    const posFormat = this.parseUShort();
    if (posFormat === 1) {
        let pos = {
            posFormat: posFormat,
            mark1Coverage: this.parsePointer(Parser.coverage),
            mark2Coverage: this.parsePointer(Parser.coverage),
        };
        let markClassCount = pos.markClassCount = this.parseUShort();

        pos.mark1s = this.parsePointer(function () {
            return this.parseList(this.parseUShort(), function() {
                return {
                    markClass: this.parseUShort(),
                    markAnchor: this.parseAnchor(),
                };
            });
        });
        pos.mark2s = this.parsePointer(function () {
            return this.parseList(this.parseUShort(), function () {
                return {
                    mark2Anchors: this.parseList(markClassCount, function () {
                        return this.parseAnchor();
                    }),
                };
            });
        });
        return pos;
    } else {
        return { error: '0x' + start.toString(16) + ': GPOS lookup type 6 format must be 1 or 2.' };
    }
};

const lookupRecordDesc = {
    sequenceIndex: Parser.uShort,
    lookupListIndex: Parser.uShort
};

subtableParsers[7] = function parseLookup7() {
    const start = this.offset + this.relativeOffset;
    const substFormat = this.parseUShort();

    if (substFormat === 1) {
        return {
            posFormat: substFormat,
            coverage: this.parsePointer(Parser.coverage),
            ruleSets: this.parseListOfLists(function() {
                const glyphCount = this.parseUShort();
                const substCount = this.parseUShort();
                return {
                    input: this.parseUShortList(glyphCount - 1),
                    lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 2) {
        return {
            posFormat: substFormat,
            coverage: this.parsePointer(Parser.coverage),
            classDef: this.parsePointer(Parser.classDef),
            classSets: this.parseListOfLists(function() {
                const glyphCount = this.parseUShort();
                const substCount = this.parseUShort();
                return {
                    classes: this.parseUShortList(glyphCount - 1),
                    lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 3) {
        const glyphCount = this.parseUShort();
        const substCount = this.parseUShort();
        return {
            posFormat: substFormat,
            coverages: this.parseList(glyphCount, Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
        };
    }
    check.assert(false, '0x' + start.toString(16) + ': lookup type 7 format must be 1, 2 or 3.');
};

subtableParsers[8] = function parseLookup8() {
    const start = this.offset + this.relativeOffset;
    const substFormat = this.parseUShort();
    if (substFormat === 1) {
        return {
            posFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            chainRuleSets: this.parseListOfLists(function() {
                return {
                    backtrack: this.parseUShortList(),
                    input: this.parseUShortList(this.parseShort() - 1),
                    lookahead: this.parseUShortList(),
                    lookupRecords: this.parseRecordList(lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 2) {
        return {
            posFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            backtrackClassDef: this.parsePointer(Parser.classDef),
            inputClassDef: this.parsePointer(Parser.classDef),
            lookaheadClassDef: this.parsePointer(Parser.classDef),
            chainClassSet: this.parseListOfLists(function() {
                return {
                    backtrack: this.parseUShortList(),
                    input: this.parseUShortList(this.parseShort() - 1),
                    lookahead: this.parseUShortList(),
                    lookupRecords: this.parseRecordList(lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 3) {
        return {
            posFormat: 3,
            backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            inputCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(lookupRecordDesc)
        };
    }
    check.assert(false, '0x' + start.toString(16) + ': lookup type 8 format must be 1, 2 or 3.');
};

subtableParsers[9] = function parseLookup9() {
    const start = this.offset + this.relativeOffset;
    const posFormat = this.parseUShort();
    if (posFormat === 1) {
        const extensionLookupType = this.parseUShort();
        const pp = subtableParsers[extensionLookupType];
        if (pp) {
            return {
                posFormat,
                extensionLookupType,
                extension: this.parsePointer32(pp),
            };
        }
    } else {
        return { error: '0x' + start.toString(16) + ': GPOS lookup type 9 format must be 1.' };
    }
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos
function parseGposTable(data, start) {
    start = start || 0;
    const p = new Parser(data, start);
    const tableVersion = p.parseVersion(1);
    check.argument(tableVersion === 1 || tableVersion === 1.1, 'Unsupported GPOS table version ' + tableVersion);

    if (tableVersion === 1) {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers)
        };
    } else {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers),
            variations: p.parseFeatureVariationsList()
        };
    }

}

// GPOS Writing //////////////////////////////////////////////
// NOT SUPPORTED
const subtableMakers = new Array(10);

subtableMakers[1] = function makeLookup1(subtable) {
    check.assert(subtable.posFormat === 1, 'Lookup type 1 posFormat must be 1.');
    var tbl = [
        {name: 'posFormat', type: 'USHORT', value: 1},
        {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)},
        {name: 'valueFormat', type: 'USHORT', value: subtable.valueFormat},
    ];
    if (subtable.valueFormat & 0x0001) {
        tbl.push({name: 'xPlacement', type: 'SHORT', value: subtable.value.xPlacement});
    }
    if (subtable.valueFormat & 0x0002) {
        tbl.push({name: 'yPlacement', type: 'SHORT', value: subtable.value.yPlacement});
    }
    if (subtable.valueFormat & 0x0004) {
        tbl.push({name: 'xAdvance', type: 'SHORT', value: subtable.value.xAdvance});
    }
    if (subtable.valueFormat & 0x0008) {
        tbl.push({name: 'yAdvance', type: 'SHORT', value: subtable.value.yAdvance});
    }
    return new table.Table('posTable', tbl);
};

subtableMakers[8] = function makeLookup8(subtable) {
    if (subtable.posFormat === 1) {
        let returnTable = new table.Table('chainContextTable', [
            {name: 'posFormat', type: 'USHORT', value: subtable.posFormat},
            {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)}
        ].concat(table.tableList('chainRuleSet', subtable.chainRuleSets, function(chainRuleSet) {
            return new table.Table('chainRuleSetTable', table.tableList('chainRule', chainRuleSet, function(chainRule) {
                let tableData = table.ushortList('backtrackGlyph', chainRule.backtrack, chainRule.backtrack.length)
                    .concat(table.ushortList('inputGlyph', chainRule.input, chainRule.input.length + 1))
                    .concat(table.ushortList('lookaheadGlyph', chainRule.lookahead, chainRule.lookahead.length))
                    .concat(table.ushortList('substitution', [], chainRule.lookupRecords.length));

                chainRule.lookupRecords.forEach((record, i) => {
                    tableData = tableData
                        .concat({name: 'sequenceIndex' + i, type: 'USHORT', value: record.sequenceIndex})
                        .concat({name: 'lookupListIndex' + i, type: 'USHORT', value: record.lookupListIndex});
                });
                return new table.Table('chainRuleTable', tableData);
            }));
        })));
        return returnTable;
    } else if (subtable.posFormat === 2) {
        check.assert(false, 'lookup type 8 format 2 is not yet supported.');
    } else if (subtable.posFormat === 3) {
        let tableData = [
            {name: 'posFormat', type: 'USHORT', value: subtable.posFormat},
        ];

        tableData.push({name: 'backtrackGlyphCount', type: 'USHORT', value: subtable.backtrackCoverage.length});
        subtable.backtrackCoverage.forEach((coverage, i) => {
            tableData.push({name: 'backtrackCoverage' + i, type: 'TABLE', value: new table.Coverage(coverage)});
        });
        tableData.push({name: 'inputGlyphCount', type: 'USHORT', value: subtable.inputCoverage.length});
        subtable.inputCoverage.forEach((coverage, i) => {
            tableData.push({name: 'inputCoverage' + i, type: 'TABLE', value: new table.Coverage(coverage)});
        });
        tableData.push({name: 'lookaheadGlyphCount', type: 'USHORT', value: subtable.lookaheadCoverage.length});
        subtable.lookaheadCoverage.forEach((coverage, i) => {
            tableData.push({name: 'lookaheadCoverage' + i, type: 'TABLE', value: new table.Coverage(coverage)});
        });

        tableData.push({name: 'substitutionCount', type: 'USHORT', value: subtable.lookupRecords.length});
        subtable.lookupRecords.forEach((record, i) => {
            tableData = tableData
                .concat({name: 'sequenceIndex' + i, type: 'USHORT', value: record.sequenceIndex})
                .concat({name: 'lookupListIndex' + i, type: 'USHORT', value: record.lookupListIndex});
        });

        let returnTable = new table.Table('chainContextTable', tableData);

        return returnTable;
    }

    check.assert(false, 'lookup type 8 format must be 1, 2 or 3.');
};

function makeGposTable(gpos) {
    return new table.Table('GPOS', [
        {name: 'version', type: 'ULONG', value: 0x10000},
        {name: 'scripts', type: 'TABLE', value: new table.ScriptList(gpos.scripts)},
        {name: 'features', type: 'TABLE', value: new table.FeatureList(gpos.features)},
        {name: 'lookups', type: 'TABLE', value: new table.LookupList(gpos.lookups, subtableMakers)}
    ]);
}

export default { parse: parseGposTable, make: makeGposTable };
