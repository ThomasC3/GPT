import * as fs from 'fs';
// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import * as models from '../models';

const printAttribute = ({
  attKey, attType, ref, refPath, subSchemaName, lvl
}) => {
  const collectionId = attKey === '_id' && !subSchemaName && !attKey.includes('.');
  const nestFormat = ' '.repeat(2) + '_'.repeat(lvl * 2);
  const attName = attKey.split('.').slice(-1);

  // ObjectId with reference
  let additional = '';
  if (ref) {
    additional = `, ref: ${ref}`;
  }
  if (refPath) {
    additional = `, refPath: ${refPath}`;
  }

  return `\n${nestFormat}${collectionId ? '*' : ''}${attName} {label: "${attType}${additional}"}`;
};

const printVirtuals = (virtualAttributes) => {
  let str = '';

  const nestFormat = ' '.repeat(2);

  for (let i = 0; i < virtualAttributes.length; i += 1) {
    str += `\n${nestFormat}${virtualAttributes[i]} {label: "Virtual"}`;
  }
  return str;
};

const printRelation = ({
  from, to, rel, label, subSchemaName
}) => {
  let sep = '';
  if (subSchemaName) { sep = '.'; }
  return `\n${from} ${rel[0]}--${rel[1]} ${to} {label: "${subSchemaName}${sep}${label}"}`;
};

const printSchema = (modelName, attributes, modelSchema, lvl = 0, relationships_ = '', subSchemaName = '', parentSchemaName = []) => {
  let relationships = relationships_;
  let str = '';
  let attType;
  let attKey;

  let arrayElemType;
  let arrayRef;

  let subAttributes;
  let subSchema;

  let oldDot = '';
  let currDot;
  let dotCount = 0;

  let strOut;
  let relationshipsOut;

  let ref;
  let refPath;

  let skipSubSchemaName;

  for (let i = 0; i < attributes.length; i += 1) {
    attKey = attributes[i];
    attType = modelSchema.paths[attKey].instance;
    dotCount = attKey.split('.').length - 1;
    skipSubSchemaName = false;

    switch (attType) {
    case 'ObjectId':
      if (attKey.includes('.')) {
        [currDot] = attKey.split('.');
        if (oldDot !== currDot) {
          oldDot = currDot;
          str += printAttribute({
            attKey: attKey.split('.')[0], attType: 'Object<>', subSchemaName: '', lvl
          });
          skipSubSchemaName = true;
        }
      }

      ({ ref = null, refPath = null } = attKey.split('.').reduce((o, idx) => o[idx], modelSchema.obj) || {});
      str += printAttribute({
        attKey, attType, subSchemaName, lvl: lvl + dotCount, ref, refPath
      });
      if (ref) {
        const subSchemaNameWithParentPath = (
          skipSubSchemaName ? parentSchemaName : [...parentSchemaName, subSchemaName]
        ).join('.');
        const subSchemaNameWithPath = (
          parentSchemaName.length ? subSchemaNameWithParentPath : subSchemaName
        );
        relationships += printRelation({
          from: modelName, to: ref, rel: ['*', '1'], label: attKey, subSchemaName: subSchemaNameWithPath
        });
      }
      break;
    case 'Array':
      arrayElemType = modelSchema.paths[attKey].caster.instance;

      if (modelSchema.paths[attKey].caster.schema) {
        str += '\n'; // Ungroup array of subschemas from other attributes for legibility
        str += printAttribute({
          attKey, attType: 'Array<SubSchema>', subSchemaName, lvl: lvl + dotCount
        });

        subSchema = modelSchema.paths[attKey].caster.schema;
        subAttributes = Object.keys(subSchema.paths);
        [strOut, relationshipsOut] = printSchema(modelName, subAttributes, subSchema, lvl + 1, relationships, `${attKey}`);
        str += strOut;
        relationships = relationshipsOut;
      } else if (arrayElemType === 'ObjectID') {
        arrayRef = modelSchema.paths[attKey].options.ref;

        str += printAttribute({
          attKey, attType: `Array<${arrayElemType}>`, subSchemaName, lvl: lvl + dotCount, ref: arrayRef
        });
        relationships += printRelation({
          from: modelName, to: modelSchema.obj[attKey].ref, rel: ['*', '*'], label: attKey, subSchemaName
        });
      } else {
        str += printAttribute({
          attKey, attType: `Array<${arrayElemType}>`, subSchemaName, lvl: lvl + dotCount
        });
      }
      break;
    case 'Embedded':
      str += '\n'; // Ungroup embedded schema from other attributes for legibility
      str += printAttribute({
        attKey, attType: 'SubSchema<>', subSchemaName, lvl
      });

      if (subSchemaName) {
        parentSchemaName.push(subSchemaName);
      }
      subSchema = modelSchema.obj[attKey].type;
      subAttributes = Object.keys(subSchema.paths);
      [
        strOut,
        relationshipsOut
      ] = printSchema(
        modelName, subAttributes, subSchema, lvl + 1, relationships, attKey, parentSchemaName
      );
      str += strOut;
      relationships = relationshipsOut;
      break;
    default:
      str += printAttribute({
        attKey, attType, subSchemaName, lvl: lvl + dotCount
      });
    }
  }
  if (subSchemaName || attKey.includes('.')) {
    str += '\n'; // Ungroup subschemas and nested object from other attributes for legibility
  }
  return [str, relationships];
};

export const exportMongoDBSchema = () => {
  const colors = [
    '#ececfc',
    '#d0e0d0',
    '#fcecec'
  ];

  const modelKeys = Object.keys(models).sort();

  let model;
  let modelSchema;
  let modelName;
  let attributes;
  let virtuals;

  let strOut;
  let strOut2;
  let relationshipsOut;

  let relationships = '';
  let str = 'title {label: "Circuit ERD", size: "20"}\n\n# Entities\n';

  for (let i = 0; i < modelKeys.length; i += 1) {
    model = models[modelKeys[i]];
    modelSchema = model.schema;
    modelName = modelKeys[i].slice(-3) === 'ies' ? modelKeys[i] : modelKeys[i].slice(0, -1);

    if (modelSchema?.obj) {
      str += `\n[${modelName}] {bgcolor: "${colors[i % colors.length]}"}`;
      attributes = Object.keys(modelSchema.paths).sort();
      virtuals = Object.keys(modelSchema.virtuals).sort();

      if (attributes.includes('_id')) {
        attributes.splice(attributes.indexOf('_id'), 1);
        attributes = ['_id', ...attributes];
      }
      if (virtuals.includes('id')) {
        virtuals.splice(virtuals.indexOf('id'), 1);
      }

      [strOut, relationshipsOut] = printSchema(modelName, attributes, modelSchema, 0, '');
      strOut2 = printVirtuals(virtuals);
      str += strOut;
      str += `${strOut2 ? '\n' : ''}${strOut2}`;
      relationships += `${relationshipsOut ? '\n' : ''}${relationshipsOut}`;
      str += '\n';
    }
  }
  str += '\n\n# Relationships';
  str += relationships;

  fs.writeFileSync('full_schema.er', str);
};

export const run = () => {
  try {
    exportMongoDBSchema();
    console.log('Export was successful!');
  } catch (error) {
    console.log(error);
    console.log('Export was unsuccessful!');
  }
  process.exit(0);
};

run();

export default run;
