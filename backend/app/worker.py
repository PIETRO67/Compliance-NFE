from redis import Redis
from rq import Worker
from .config import get_settings


# Infraestrutura de filas; não agenda emissão ou cobrança no M1.
def main():
    Worker(["foundation"], connection=Redis.from_url(get_settings().redis_url)).work()


if __name__ == "__main__":
    main()
