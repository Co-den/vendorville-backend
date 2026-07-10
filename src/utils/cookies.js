export const cookies = {
  getOptions: () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 24 * 60 * 60 * 1000,
  }),

  setCookie: (res, name, value, options) => {
    res.cookie(name, value, { ...cookies.getOptions(), ...options });
  },

  clearCookie: (res, name, options) => {
    res.clearCookie(name, { ...cookies.getOptions(), ...options });
  },

  getCookie: (req, name) => {
    return req.cookies[name];
  },
};
