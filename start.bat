@echo off
wt -d ./server cmd /k "title Backend && npm run dev" ; new-tab -d ./frontend cmd /k "title Frontend && npm run dev"