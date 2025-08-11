FROM nginx:bullseye

RUN mkdir -p /run/nginx

RUN mkdir -p /etc/nginx/ssl

RUN apt update && apt install -y openssl

RUN openssl req -x509 -nodes -out /etc/nginx/ssl/fullchain.pem -keyout /etc/nginx/ssl/privkey.pem -subj "/  CN=localhost"

COPY /front /usr/share/nginx/html

COPY /nginx/default.conf ./etc/nginx/conf.d/default.conf 



