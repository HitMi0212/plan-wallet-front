const axiosInstance = jest.fn();

axiosInstance.create = jest.fn(() => axiosInstance);
axiosInstance.get = jest.fn();
axiosInstance.post = jest.fn();
axiosInstance.patch = jest.fn();
axiosInstance.delete = jest.fn();
axiosInstance.interceptors = {
  request: { use: jest.fn() },
  response: { use: jest.fn() },
};

module.exports = axiosInstance;
