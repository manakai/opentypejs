// The `post` table stores additional PostScript information, such as glyph names.
// https://www.microsoft.com/typography/OTSPEC/post.htm

import { standardNames } from '../encoding';
import parse from '../parse';
import table from '../table';

// Parse the PostScript `post` table
function parsePostTable(data, start, numGlyphs) {
    const post = {};
    const p = new parse.Parser(data, start);
    post.version = p.parseVersion();
    post.italicAngle = p.parseFixed();
    post.underlinePosition = p.parseShort();
    post.underlineThickness = p.parseShort();
    post.isFixedPitch = p.parseULong();
    post.minMemType42 = p.parseULong();
    post.maxMemType42 = p.parseULong();
    post.minMemType1 = p.parseULong();
    post.maxMemType1 = p.parseULong();
    switch (post.version) {
        case 1:
            post.glyphIDToName = post.names = standardNames.slice();
            break;
        case 2:
            post.numberOfGlyphs = p.parseUShort();
            post.glyphNameIndex = new Array(post.numberOfGlyphs);
            for (let i = 0; i < post.numberOfGlyphs; i++) {
                post.glyphNameIndex[i] = p.parseUShort();
            }

            let maxNameIndex = Math.max(... post.glyphNameIndex);
            // For compat, the following constraint is not enforced:
            //if (maxNameIndex > 32767) maxNameIndex = 32767;

            post.names = [];
            let nameIndexToName = standardNames.slice();
            delete nameIndexToName[0];
            for (let i = 258; i <= maxNameIndex; i++) {
                const nameLength = p.parseChar();
                const name = p.parseString(nameLength);
                post.names.push(name);
                nameIndexToName[i] = name;
            }

            post.glyphIDToName = [];
            for (let i = 0; i < post.numberOfGlyphs; i++) {
                const nameIndex = post.glyphNameIndex[i];
                const name = nameIndexToName[nameIndex];
                if (name) post.glyphIDToName[i] = name;
            }

            break;
        case 2.5:
            post.numberOfGlyphs = p.parseUShort();
            post.offset = new Array(post.numberOfGlyphs);
            post.names = [];
            post.glyphIDToName = [];
            for (let i = 0; i < post.numberOfGlyphs; i++) {
                let offset = post.offset[i] = p.parseChar();
                const name = standardNames[i + offset];
                if (name) {
                    post.names.push(name);
                    post.glyphIDToName[i] = name;
                }
            }

            break;
        case 3:
            break;
        case 4:
            post.names = [];
            post.glyphIDToName = [];
            for (let i = 0; i < numGlyphs; i++) {
                let code = p.parseUShort();
                if (code !== 0xFFFF) {
                    let name = 'a' + code.toString(16).toUpperCase();
                    post.names.push(name);
                    post.glyphIDToName[i] = name;
                }
            }

            break;
    }
    return post;
}

function makePostTable() {
    return new table.Table('post', [
        {name: 'version', type: 'FIXED', value: 0x00030000},
        {name: 'italicAngle', type: 'FIXED', value: 0},
        {name: 'underlinePosition', type: 'FWORD', value: 0},
        {name: 'underlineThickness', type: 'FWORD', value: 0},
        {name: 'isFixedPitch', type: 'ULONG', value: 0},
        {name: 'minMemType42', type: 'ULONG', value: 0},
        {name: 'maxMemType42', type: 'ULONG', value: 0},
        {name: 'minMemType1', type: 'ULONG', value: 0},
        {name: 'maxMemType1', type: 'ULONG', value: 0}
    ]);
}

export default { parse: parsePostTable, make: makePostTable };
