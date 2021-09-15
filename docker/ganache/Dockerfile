FROM trufflesuite/ganache-cli:latest AS zkcream-ganache

COPY --from=ganache-deployed /app /app
COPY --from=ganache-deployed /entrypoint.sh /entrypoint.sh

ENTRYPOINT ["sh", "/entrypoint.sh"]