import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "WalkGuardianAI/1.0"


async def reverse_geocode(lat: float, lon: float) -> dict:
    """
    Call OpenStreetMap Nominatim reverse geocoding API server-side.

    Returns the JSON response from Nominatim, or raises HTTPException
    if something goes wrong.
    """
    params = {
        "format": "jsonv2",
        "lat": lat,
        "lon": lon,
        "addressdetails": 1,
    }

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(NOMINATIM_URL, params=params, headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error calling Nominatim: {exc}",
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Nominatim error: {resp.text[:200]}",
        )

    try:
        data = resp.json()
    except ValueError:
        raise HTTPException(
            status_code=502,
            detail=f"Nominatim returned invalid JSON: {resp.text[:200]}",
        )

    return data