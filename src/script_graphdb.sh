#!/bin/sh
sed -i 's~t.otherwise({templateUrl:"pages/not_found.html"}),~t.when("/%%name%%/:id*", { redirectTo: (routeParams) => `/resource?uri=http://%%host%%/%%name%%/${routeParams.id}`}),t.otherwise({templateUrl:"pages/not_found.html"}),~g' /opt/graphdb/dist/lib/workbench/bundle.232a4218c3d298e1979f.bundle.js
