jest.mock('axios');

describe('api client', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('adds Authorization header when access token exists', async () => {
    const tokenService = require('../services/token');
    jest.spyOn(tokenService, 'loadTokens').mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const axiosInstance = require('axios');
    const { getApiClient } = require('../services/api');
    getApiClient();

    const requestHandler = axiosInstance.interceptors.request.use.mock.calls[0][0];

    const config = await requestHandler({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer access');
  });

  it('refreshes token on 401 and retries request', async () => {
    const tokenService = require('../services/token');
    jest.spyOn(tokenService, 'loadTokens').mockResolvedValue({
      accessToken: 'expired',
      refreshToken: 'refresh',
    });
    const saveSpy = jest.spyOn(tokenService, 'saveTokens').mockResolvedValue();
    const clearSpy = jest.spyOn(tokenService, 'clearTokens').mockResolvedValue();

    const axiosInstance = require('axios');
    axiosInstance.post.mockResolvedValue({
      data: { accessToken: 'newAccess', refreshToken: 'newRefresh' },
    });

    const { getApiClient } = require('../services/api');
    getApiClient();

    const responseHandler = axiosInstance.interceptors.response.use.mock.calls[0][1];

    const original = { headers: {}, url: '/test' };
    axiosInstance.mockImplementationOnce(() => Promise.resolve({ data: 'ok' }));

    await responseHandler({ response: { status: 401 }, config: original });

    expect(saveSpy).toHaveBeenCalledWith('newAccess', 'newRefresh');
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
