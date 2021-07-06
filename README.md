List2Dereference
================

Export vhost command for dereferencing in Virtuoso from a list.

Run with:

    npx list2dereference config.yml


The config file includes the following fields:

```yaml
host: data.silknow.org # required
port: 8873 # default 8889
admin: troncy@eurecom.fr # default you@example.org
triplestore: virtuoso # or graphdb
apache_conf: source.conf # if you want to customise the apache conf

list: # default []
  - vocabulary
  - document
```

The output consists of:
- the Apache vhost configuration
- a SQL script (only for Virtuoso)
- a bash script (only for GraphDB)
