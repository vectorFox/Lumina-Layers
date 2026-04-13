FROM m.daocloud.io/docker.io/library/python:3.13-slim

WORKDIR /app

COPY requirements.txt /app/

RUN sed -i 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    sed -i 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g' /etc/apt/sources.list 2>/dev/null || true && \
    echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries && \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    gcc \
    pkg-config \
    libcairo2-dev \
    libgl1 \
    libglib2.0-0 \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root/.pip && \
    printf "[global]\nindex-url = https://pypi.tuna.tsinghua.edu.cn/simple\ntrusted-host = pypi.tuna.tsinghua.edu.cn\ndefault-timeout = 120\n" > /root/.pip/pip.conf

RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

EXPOSE 7860

ENV PYTHONUNBUFFERED=1
ENV LUMINA_HOST=0.0.0.0

CMD ["python", "main.py"]