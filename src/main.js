#!/usr/bin/env node
const fs = require('fs');
const YAML = require('yaml');
const { ArgumentParser } = require('argparse');

const zip = (a, b) => a.map((k, i) => [k, b[i]]);

const DEFAULTS = {
  virtuoso: ['sparql', 'fct', 'conductor', 'DAV', 'describe'],
  graphdb: ['sparql', 'login', 'import', 'resource'],
};
const TEMPLATE_VIRTUOSO = fs.readFileSync(`${__dirname}/vhost.template.sql`, 'utf8');
const TEMPLATE_GRAPHDB = fs.readFileSync(`${__dirname}/script_graphdb.sh`, 'utf8');
const TEMPLATE_APACHE = `${__dirname}/apache.template.conf`;

function handleError(err) {
  if (err) console.error(err);
}

function toVhost(item, id, host, template) {
  return template.replace(/%%name%%/g, item)
    .replace(/%%host%%/g, host)
    .replace(/%%id%%/g, ++id);
}

function toApacheProxyPass(item, port = 8889, triplestore) {
  temp = triplestore === 'graphdb' ? `RewriteRule ^/${item[0]}(.*)$ http://%{SERVER_NAME}/resource?uri=http://data.odeuropa.eu/${item[0]}$1` : ''
  return `    ${temp}
      ProxyPass /${item[0]} http://localhost:${port}/${item[1]}
    ProxyPassReverse /${item[0]} http://localhost:${port}/${item[1]}
`;
}

function run(config) {
  const { host } = config;
  if (!host) {
    throw Error('Host is a required parameter in configuration');
  }
  if (host.startsWith('http://') || host.startsWith('http://')) {
    throw Error('Host should not contain http(s):// ');
  }

  // virtuoso vhost
  let ls = new Set((config.list || []));
  const triplestore = DEFAULTS[config.triplestore] ? config.triplestore : 'virtuoso';
  for (const s of DEFAULTS[triplestore]) ls.delete(s);
  ls = [...ls];

  if (triplestore === 'virtuoso') {
    const all = ls.map((item, i) => toVhost(item, i, host, TEMPLATE_VIRTUOSO)).join('\n\n');
    fs.writeFile('insert_vhost.sql', all, handleError);
  }

  // script graphdb
  if (triplestore === 'graphdb') {
    const all = ls.map((item, i) => toVhost(item, i, host, TEMPLATE_GRAPHDB)).join('\n\n');
    fs.writeFile('script_graphdb.sh', all, handleError);
  }

  // apache
  let destURIs = ls;
  if (triplestore === 'graphdb') {
    destURIs = ls.map((item) => `resource?uri=${encodeURIComponent(`http://${host}/${item}`)}`);
  }
  const apacheLs = ls.concat(DEFAULTS[triplestore]);
  const apacheDest = destURIs.concat(DEFAULTS[triplestore]);

  const template = fs.readFileSync(config.apache_conf || TEMPLATE_APACHE, 'utf8');
  const apache = zip(apacheLs, apacheDest)
    .map((item) => toApacheProxyPass(item, config.port, triplestore));

  const apacheCont = template
    .replace(/%admin%/g, config.admin || 'you@example.org')
    .replace(/%host%/g, host)
    .replace(/%rules%/g, apache.join('\n\n'));
  fs.writeFile(`${host}.conf`, apacheCont, handleError);
}

function parseArgs() {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'Export vhost command for dereferencing in Virtuoso or GraphDB from a list.',
  });
  parser.add_argument('config', {
    help: 'Path of the configuration file in yaml format',
  });
  parser.add_argument('-v', '--version', { action: 'version', version: '0.2.0' });

  return parser.parse_args();
}

const args = parseArgs();
const file = fs.readFileSync(args.config, 'utf8');
run(YAML.parse(file));
