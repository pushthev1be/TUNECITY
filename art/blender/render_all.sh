#!/usr/bin/env bash
# Render every car's layers and pixelize them, three Blender processes at a time.
#   bash art/blender/render_all.sh [car ...]      (no args = every car in car_specs.py)
set -u
cd "$(dirname "$0")/../.."
B="${BLENDER:-/c/Program Files/Blender Foundation/Blender 3.6/blender.exe}"
CARS=("$@")
[ ${#CARS[@]} -eq 0 ] && CARS=(civic_eg charger_69 m4 urus corvette camry hellcat ram_trx wrx mystery_0e mystery_88 mystery_ae)
run() {
  local c=$1
  rm -rf "art/blender/out/$c/raw"
  "$B" -b --factory-startup --python art/blender/tunecity_cars.py -- --car "$c" > "art/blender/out/$c.log" 2>&1
  python art/blender/pixelize.py --car "$c" >> "art/blender/out/$c.log" 2>&1
  echo "$c: $(tail -1 "art/blender/out/$c.log")"
}
mkdir -p art/blender/out
i=0
for c in "${CARS[@]}"; do
  run "$c" &
  i=$((i + 1))
  if [ $((i % 3)) -eq 0 ]; then wait; fi
done
wait
echo ALL DONE
