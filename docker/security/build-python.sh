#!/usr/bin/env bash
# Adapted from docker-library/python 01dcc3d31fcd879f9af36e097bd96328a457f4bd,
# 3.14/slim-trixie/Dockerfile. See runtime-report.md for deliberate differences.
set -euxo pipefail
saved_apt_mark="$(apt-mark showmanual)"
apt-get update
apt-get install -y --no-install-recommends \
    dpkg-dev gcc g++ libbluetooth-dev libbz2-dev libc6-dev libdb-dev \
    libffi-dev libgdbm-dev liblzma-dev libncursesw5-dev libreadline-dev \
    libsqlite3-dev libssl-dev libzstd-dev make patch tk-dev uuid-dev wget xz-utils zlib1g-dev
wget -O /tmp/python.tar.xz "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz"
echo "${PYTHON_SHA256}  /tmp/python.tar.xz" | sha256sum -c -
mkdir -p /usr/src/python
tar -xJf /tmp/python.tar.xz -C /usr/src/python --strip-components=1
rm /tmp/python.tar.xz
cd /usr/src/python
echo '527e714523264093910a0a0b1a55c6583f952835c89061537fc40ad98c347056  Lib/poplib.py' | sha256sum -c -
patch --fuzz=0 -p1 < /tmp/poplib.patch
echo 'a6ffff188814b56d95b043c31d9e0dfee51ac6d6e92afe74ab070cb6136b076f  Lib/poplib.py' | sha256sum -c -
./configure --build="$(dpkg-architecture --query DEB_BUILD_GNU_TYPE)" \
    --enable-loadable-sqlite-extensions --enable-option-checking=fatal \
    --enable-shared --without-ensurepip
# Two compiler jobs, no PGO/LTO: bounded memory on development/build hosts.
extra_cflags="$(dpkg-buildflags --get CFLAGS) -fno-omit-frame-pointer -mno-omit-leaf-frame-pointer"
ldflags="$(dpkg-buildflags --get LDFLAGS) -Wl,--strip-all"
make -j2 "EXTRA_CFLAGS=$extra_cflags" "LDFLAGS=$ldflags"
rm python
make -j2 "EXTRA_CFLAGS=$extra_cflags" "LDFLAGS=$ldflags -Wl,-rpath='\$\$ORIGIN/../lib'" python
make install
cd /
rm -rf /usr/src/python
find /usr/local -depth \( \( -type d \( -name test -o -name tests -o -name idle_test -o -name ensurepip \) \) \
    -o \( -type f \( -name '*.pyc' -o -name '*.pyo' -o -name 'libpython*.a' \) \) \) -exec rm -rf '{}' +
ldconfig
apt-mark auto '.*' > /dev/null
# shellcheck disable=SC2086
apt-mark manual $saved_apt_mark
find /usr/local -type f -executable -not -name '*tkinter*' -exec ldd '{}' ';' \
    | awk '/=>/ { so = $(NF-1); if (index(so, "/usr/local/") == 1) next; gsub("^/(usr/)?", "", so); printf "*%s\n", so }' \
    | sort -u | xargs -rt dpkg-query --search \
    | awk 'sub(":$", "", $1) { print $1 }' | sort -u | xargs -r apt-mark manual
apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false
rm -rf /var/lib/apt/lists/*
for src in idle3 pydoc3 python3 python3-config; do
    dst="$(echo "$src" | tr -d 3)"
    ln -svT "$src" "/usr/local/bin/$dst"
done
python3 --version
python3 /tmp/test-poplib.py
