# Customized geth for large contract size deployment
FROM kazdock/go-client-couger:v1.0.0 AS zk-geth

COPY ./docker/geth /root/
RUN /root/init.sh

ENTRYPOINT ["/root/entrypoint.sh"]