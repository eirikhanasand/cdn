FROM alpine:latest
RUN apk add --no-cache postgresql-client bash
WORKDIR /app
COPY flush_request_logs.sh /app/flush_request_logs.sh
RUN chmod +x /app/flush_request_logs.sh
RUN echo "0 * * * * /bin/bash /app/flush_request_logs.sh 2>&1" >> /etc/crontabs/root
CMD ["crond", "-f", "-l", "2"]
