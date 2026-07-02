#!/bin/bash
open_braces=$(grep -o "{" src/components/desktop/ScreenTgGiftsSniper.tsx | wc -l)
close_braces=$(grep -o "}" src/components/desktop/ScreenTgGiftsSniper.tsx | wc -l)
echo "Open: $open_braces"
echo "Close: $close_braces"
