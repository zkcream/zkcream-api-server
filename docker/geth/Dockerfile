FROM ethereum/client-go:latest

ADD . /root/
RUN /root/init.sh

ENTRYPOINT ["/root/entrypoint.sh"]