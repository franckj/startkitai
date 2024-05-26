#!/bin/bash

# Define the path for the .env and .env.example files
ENV_PATH=".env"
ENV_EXAMPLE_PATH=".env.example"

# Default values for environment variables
EMBEDDINGS_BEARER_TOKEN=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

if [ -f "$ENV_PATH" ]; then
  echo ".env file already exists. No changes made. Delete it if you want to run setup again."
  exit 0
else
  touch "$ENV_PATH"
fi

# Read .env.example line by line
while IFS= read -r line || [[ -n "$line" ]]; do
  # Check if the line is a comment or empty
  if [[ "$line" == \#* ]] || [[ -z "$line" ]]; then
    # Write comments and empty lines to the .env file as is
    echo "$line" >>"$ENV_PATH"
  else
    # It's a key=value pair, process it
    key=$(echo "$line" | cut -d '=' -f 1)
    value=$(echo "$line" | cut -d '=' -f 2-)

    # Check for specific keys to replace with new values
    case "$key" in
    "EMBEDDINGS_BEARER_TOKEN")
      echo "EMBEDDINGS_BEARER_TOKEN=$EMBEDDINGS_BEARER_TOKEN" >>"$ENV_PATH"
      ;;
    "JWT_SECRET")
      echo "JWT_SECRET=$JWT_SECRET" >>"$ENV_PATH"
      ;;
    *)
      # For all other keys, keep the existing value from .env.example
      echo "$line" >>"$ENV_PATH"
      ;;
    esac
  fi
done <"$ENV_EXAMPLE_PATH"

echo ".env file has been successfully created with comments preserved."
