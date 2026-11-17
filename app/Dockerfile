FROM public.ecr.aws/docker/library/node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914
WORKDIR /srv/app
COPY package.json package-lock.json ./
# node_modules is installed here unless the build context already carries it (offline builds)
COPY . .
RUN [ -d node_modules/express ] || npm ci --omit=dev --no-audit --no-fund
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server/index.js"]
