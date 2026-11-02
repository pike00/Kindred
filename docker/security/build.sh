#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
platform="${1:-linux/amd64}"
target="${2:-runtime}"
case "$target" in runtime|python-base|dependency-builder) ;; *) echo 'Unsupported build target' >&2; exit 2 ;; esac
case "$platform" in
  linux/amd64)
    debian=4876fdea29cac1a33a3195f1eb1952feb1fca7dd6dd00be3e2f1879cf20d34d2
    node=ea11b74b986d520137cdef9a5346e447a00f275ecc4abc0055b7151226231e09
    uv=a12ede1e6dc90d3b3e600d0901731e71f0ab0f4d72683ea097b76c19c43cc8df
    ;;
  linux/arm64)
    debian=a66b19aa552f595b4ab276c6b4f9b24fa4546632c5ecd88cccdced4a6866323a
    node=ceb43e5c219139035fb742900629e4abed89fe0997f7c03250c499e1f2710c9e
    uv=d3a8362fee5c061dd78452b5915598fc8fbd15050db3a3d919fba5f2e38c629a
    ;;
  *) echo 'Only recorded linux/amd64 and linux/arm64 inputs are supported' >&2; exit 2 ;;
esac
# An edited checkout can build disposable tests, but cannot claim a committed
# revision for deployment. The deployment gate rejects the empty revision.
revision=""
if [[ -z "$(git status --porcelain)" ]]; then
  revision="$(git rev-parse HEAD)"
fi
# Keep output local. The tag is deliberately unrelated to a public registry.
exec docker build --load --platform "$platform" --target "$target" \
  --build-arg "DEBIAN_IMAGE=debian@sha256:$debian" \
  --build-arg "NODE_IMAGE=node@sha256:$node" \
  --build-arg "UV_IMAGE=ghcr.io/astral-sh/uv@sha256:$uv" \
  --build-arg "GIT_HASH=$(git rev-parse HEAD)" \
  --build-arg "BUILD_REVISION=$revision" \
  --build-arg APP_VERSION=0.2.123 \
  --tag "kindred-security:$target-${platform#linux/}" \
  --file Dockerfile.prod .
