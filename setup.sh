#!/bin/bash

if [ ! -f config/config.json ]; then
  echo "Копируем дефолтную конфигурацию..."
  mkdir config

  URL="https://raw.githubusercontent.com/PinoutLTD/libp2p-ws-proxy/refs/heads/main/config/config.template.json"
  OUTPUT="config/config.json"

  echo "Скачивание файла с $URL ..."
  if curl -f -L -o "$OUTPUT" "$URL"; then
      echo "Файл успешно сохранён как $OUTPUT"
  else
      echo "Ошибка при скачивании файла. Проверьте URL и интернет-соединение."
      rm -f "$OUTPUT"  # Удаляем частично скачанный файл
      exit 1
  fi
fi
