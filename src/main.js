#!/usr/bin/env node
const fs = require('fs');
const YAML = require('yaml');
const { ArgumentParser } = require('argparse');

const VIRTUOSO_DEFAULTS = ['sparql', 'fct', 'conductor', 'DAV', 'describe'];
const TEMPLATE = fs.readFileSync(`${__dirname}/vhost.template.sql`, 'utf8');
const TEMPLATE_APACHE = `${__dirname}/apache.template.conf`;

function handleError(err) {
  if (err) console.error(err);
}

function toVhost(item, id, host) {
  return TEMPLATE.replace(/%%name%%/g, item)
    .replace(/%%host%%/g, host)
    .replace(/%%id%%/g, ++id);
}

function toApacheProxyPass(item, port = 8889) {
  return `    ProxyPass /${item} http://localhost:${port}/${item}
    ProxyPassReverse /${item} http://localhost:${port}/${item}
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
  for (const s of VIRTUOSO_DEFAULTS) ls.delete(s);
  ls = [...ls];
  const all = ls.map((item, i) => toVhost(item, i, host)).join('\n\n');
  fs.writeFile('insert_vhost.sql', all, handleError);

  // apache
  const apacheLs = [...new Set((config.list || []).concat(VIRTUOSO_DEFAULTS))];
  const template = fs.readFileSync(config.apache_conf || TEMPLATE_APACHE, 'utf8');
  const apache = apacheLs
    .map((item) => toApacheProxyPass(item, config.port));
  const apacheCont = template
    .replace('%admin%', config.admin || 'you@example.org')
    .replace('%host%', host)
    .replace('%rules%', apache.join('\n\n'));
  fs.writeFile(`${host}.conf`, apacheCont, handleError);
}

function parseArgs() {
  const parser = new ArgumentParser({
    version: '0.1.0',
    addHelp: true,
    description: 'Export vhost command for dereferencing in Virtuoso from a list.',
  });
  parser.addArgument('config', {
    help: 'Path of the configuration file in yaml format',
  });

  return parser.parseArgs();
}

const args = parseArgs();
const file = fs.readFileSync(args.config, 'utf8');
run(YAML.parse(file));
