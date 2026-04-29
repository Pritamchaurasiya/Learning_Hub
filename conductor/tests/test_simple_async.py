
import pytest
import asyncio

@pytest.mark.asyncio
async def test_basic_async():
    await asyncio.sleep(0.01)
    assert True
