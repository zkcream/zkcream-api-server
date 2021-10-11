# Customized geth for large contract size deployment
FROM kazdock/go-client-couger:v1.0.0 AS zkcream-geth

COPY --from=geth-deployed /root /root
COPY --from=geth-deployed /root/entrypoint.sh /root/entrypoint.sh

ENTRYPOINT ["/root/entrypoint.sh"]