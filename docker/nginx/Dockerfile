FROM nginx:1.21-alpine  AS zkcream-nginx

COPY ./nginx.conf /etc/nginx/nginx.conf

WORKDIR /

CMD nginx -c /etc/nginx/nginx.conf -g 'daemon off;'