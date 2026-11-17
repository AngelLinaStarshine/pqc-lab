# PQC Lab sandbox: Temurin JDK 21.0.13 + Bouncy Castle 1.79, no network.
# Pin both base images by digest before the pilot (see README, "Freeze the versions").
FROM public.ecr.aws/docker/library/node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da AS node

FROM public.ecr.aws/docker/library/eclipse-temurin:21-jdk@sha256:ebfbb18d11ff163ee83b21258acf12248af48d22a0fdfdc68fa1a1516c05976a
COPY --from=node /usr/local/bin/node /usr/local/bin/node
# bcprov-jdk18on-1.79.jar, SHA-256 0d81ecc3124536b539bce9aa3fe9621b7f84c9cee371b635a5b31c78b79ab1da
COPY bcprov-jdk18on-1.79.jar /opt/bc/bcprov-jdk18on-1.79.jar
RUN echo "0d81ecc3124536b539bce9aa3fe9621b7f84c9cee371b635a5b31c78b79ab1da  /opt/bc/bcprov-jdk18on-1.79.jar" | sha256sum -c - \
 && groupadd -g 10001 sandbox && useradd -u 10001 -g 10001 -M -d /nonexistent -s /usr/sbin/nologin sandbox \
 && chmod 0444 /opt/bc/bcprov-jdk18on-1.79.jar
COPY runner.js /srv/runner.js
ENV PORT=8090 JAVA_TOOL_OPTIONS=
EXPOSE 8090
CMD ["node", "/srv/runner.js"]
