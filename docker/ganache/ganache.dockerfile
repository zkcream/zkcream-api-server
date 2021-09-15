FROM trufflesuite/ganache-cli:latest AS zk-ganache

COPY ./docker/ganache/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["sh", "/entrypoint.sh"]