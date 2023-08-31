// The `BASE` table contains baselines in OpenType fonts.
// https://www.microsoft.com/typography/OTSPEC/base.htm

import parse from '../parse';
import table from '../table';

// Parse the `BASE` table
function parseBASETable(data, start) {
    const base = {};
    const p = new parse.Parser(data, start);
    base.version = p.parseVersion();

    base.horizAxisOffset = p.parseOffset16();
    base.vertAxisOffset = p.parseOffset16();
    ['horizAxis', 'vertAxis'].forEach(function(key) {
        base[key] = {};
        const axisParser = new parse.Parser(data, start + base[key + 'Offset']);

        axisParser.parsePointer(function() {
            base[key].baselineTags = this.parseList(this.parseUShort(), function() {
                return this.parseTag();
            });
        });

        axisParser.parsePointer(function() {
            base[key].baseScriptRecords = this.parseList(this.parseUShort(), function() {
                let record = {};
                record.baseScriptTag = this.parseTag();
                record.baseScript = this.parsePointer(function() {
                    let baseScript = {};
                    baseScript.baseValues = this.parsePointer(function() {
                        let baseValues = {};

                        baseValues.defaultBaselineIndex = this.parseUShort();
                        baseValues.baseCoords = this.parseList(this.parseUShort(), function() {
                            return this.parseBaseCoord();
                        });

                        return baseValues;
                    });
                    baseScript.defaultMinMax = this.parseMinMax();
                    baseScript.baseLangSysRecords = this.parseList(this.parseUShort(), function() {
                        let sysRecord = {};
                        sysRecord.baseLangSysTag = this.parseTag();
                        sysRecord.minMax = this.parseMinMax();
                        return sysRecord;
                    });
                    return baseScript;
                });

                return record;
            });
        });
    });

    //if (base.version >= 1.1) {
    //    //XXX base.itemVarStoreOffset = p.parseOffset32();
    //}

    return base;
}

function makeBASETable(options) {
    let baseTable = new table.Table('BASE', [
        {name: 'majorVersion', type: 'USHORT', value: 1},
        {name: 'minorVersion', type: 'USHORT', value: 1},
        {name: 'horizAxisOffset', type: 'USHORT', value: 0},
        {name: 'vertAxisOffset', type: 'USHORT', value: 0},

        // version >= 1.1
        {name: 'itemVarStoreOffset', type: 'ULONG', value: 0},
    ], options);

    return baseTable;
}

export default { parse: parseBASETable, make: makeBASETable };
