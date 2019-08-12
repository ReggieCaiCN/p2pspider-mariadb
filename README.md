# p2pspider-mariadb

    mysql -u user -p -e 'create database db collate utf8mb4_unicode_ci'
    mysql -u user -p db < db.sql
    vi index.js
    node index.js

#mysql
use db;
select * from info orderby id desc limit 10;

#error
pm2 log
pm2 monit

rm -rf node_modules
npm install	
