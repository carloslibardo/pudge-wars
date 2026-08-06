"""Metadata-only Workshop update via the Steamworks flat API, run on a Mac.

This is the ONLY route that can set Workshop tags for app 570, and Dota's
Arcade browse lists only items tagged "Custom Game" — so an untagged item is
published and unfindable at the same time. Everything else was tried and fails:
steamcmd's vdf `tags` block (silently ignored), the web owner controls (no tag
UI; edititem redirects away for app 570), and IPublishedFileService/Update
(401 — publisher-key only).

Requires the Steam client running and logged in on this machine; it uses the
cached session, so there is no password here and none is needed. The update is
metadata-only: content, preview and description are untouched.

    python3 scripts/workshop-set-metadata.py

Verify afterwards rather than trusting the return values — the item must come
back visibility 0 with the tag present:

    curl -s -X POST https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/ \
      -d itemcount=1 -d 'publishedfileids[0]=3778117052'
"""
import ctypes, os, sys, time

DYLIB = "/Users/libardo/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/bin/osx64/libsteam_api.dylib"
APPID, ITEM = 570, 3778117052
PUBLIC = 0  # k_ERemoteStoragePublishedFileVisibilityPublic

os.environ["SteamAppId"] = str(APPID)
os.environ["SteamGameId"] = str(APPID)

lib = ctypes.CDLL(DYLIB)
lib.SteamAPI_InitFlat.argtypes = [ctypes.c_char_p]
lib.SteamAPI_InitFlat.restype = ctypes.c_int
err = ctypes.create_string_buffer(1024)
rc = lib.SteamAPI_InitFlat(err)
if rc != 0:
    print(f"FATAL SteamAPI_InitFlat rc={rc}: {err.value.decode(errors='replace')}")
    sys.exit(1)
print("SteamAPI_InitFlat OK")

lib.SteamAPI_SteamUGC_v021.restype = ctypes.c_void_p
ugc = lib.SteamAPI_SteamUGC_v021()
if not ugc:
    print("FATAL: SteamUGC interface null"); sys.exit(1)

lib.SteamAPI_ISteamUGC_StartItemUpdate.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint64]
lib.SteamAPI_ISteamUGC_StartItemUpdate.restype = ctypes.c_uint64
h = lib.SteamAPI_ISteamUGC_StartItemUpdate(ugc, APPID, ITEM)
print(f"update handle {h}")

class SteamParamStringArray(ctypes.Structure):
    _fields_ = [("m_ppStrings", ctypes.POINTER(ctypes.c_char_p)),
                ("m_nNumStrings", ctypes.c_int32)]

tags = [b"Custom Game"]
arr = (ctypes.c_char_p * len(tags))(*tags)
sps = SteamParamStringArray(arr, len(tags))

lib.SteamAPI_ISteamUGC_SetItemTags.argtypes = [ctypes.c_void_p, ctypes.c_uint64,
                                               ctypes.POINTER(SteamParamStringArray)]
lib.SteamAPI_ISteamUGC_SetItemTags.restype = ctypes.c_bool
print("SetItemTags:", lib.SteamAPI_ISteamUGC_SetItemTags(ugc, h, ctypes.byref(sps)))

lib.SteamAPI_ISteamUGC_SetItemVisibility.argtypes = [ctypes.c_void_p, ctypes.c_uint64, ctypes.c_int]
lib.SteamAPI_ISteamUGC_SetItemVisibility.restype = ctypes.c_bool
print("SetItemVisibility(public):", lib.SteamAPI_ISteamUGC_SetItemVisibility(ugc, h, PUBLIC))

lib.SteamAPI_ISteamUGC_SubmitItemUpdate.argtypes = [ctypes.c_void_p, ctypes.c_uint64, ctypes.c_char_p]
lib.SteamAPI_ISteamUGC_SubmitItemUpdate.restype = ctypes.c_uint64
call = lib.SteamAPI_ISteamUGC_SubmitItemUpdate(ugc, h, b"set Custom Game tag + public visibility")
print(f"SubmitItemUpdate call {call}")

lib.SteamAPI_ISteamUGC_GetItemUpdateProgress.argtypes = [ctypes.c_void_p, ctypes.c_uint64,
                                                         ctypes.POINTER(ctypes.c_uint64),
                                                         ctypes.POINTER(ctypes.c_uint64)]
lib.SteamAPI_ISteamUGC_GetItemUpdateProgress.restype = ctypes.c_int
cur, tot = ctypes.c_uint64(0), ctypes.c_uint64(0)
for _ in range(60):
    lib.SteamAPI_RunCallbacks()
    st = lib.SteamAPI_ISteamUGC_GetItemUpdateProgress(ugc, h, ctypes.byref(cur), ctypes.byref(tot))
    if st == 0:  # k_EItemUpdateStatusInvalid == finished
        break
    time.sleep(1)
print(f"final update status={st}")
lib.SteamAPI_Shutdown()
print("DONE")
