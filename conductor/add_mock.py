import sys
content = open('c:\\Users\\shiva\\Desktop\\windows_app\\conductor\\conftest.py').read()
mock_code = '''
@pytest.fixture(autouse=True)
def mock_genai_client(monkeypatch):
    import google.genai as genai
    class MockClient:
        class Models:
            def generate_content(self, *args, **kwargs):
                class MockResponse:
                    text = "Mocked AI Response"
                    usage_metadata = None
                return MockResponse()
            def generate_content_stream(self, *args, **kwargs):
                class MockChunk:
                    text = "Mocked "
                yield MockChunk()
                class MockChunk2:
                    text = "Response"
                yield MockChunk2()
        def __init__(self, *args, **kwargs):
            self.models = self.Models()
    monkeypatch.setattr(genai, "Client", MockClient)
'''
if 'mock_genai_client' not in content:
    with open('c:\\Users\\shiva\\Desktop\\windows_app\\conductor\\conftest.py', 'a') as f:
        f.write('\n' + mock_code + '\n')
    print('Mock added')
else:
    print('Mock already present')
