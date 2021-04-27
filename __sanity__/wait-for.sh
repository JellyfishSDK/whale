#!/bin/sh

TIMEOUT=60

wait_for() {
  for _ in $(seq $TIMEOUT); do
    result=$(curl "$1" -o /dev/null -w '%{http_code}\n' -s)

    if [ "$result" -eq "200" ]; then
      echo "$1 is up"
      return
    fi
    sleep 5
    echo "Waiting for $1 to be up..."

  done
  echo "Wait for timed out" >&2
  exit 1
}
