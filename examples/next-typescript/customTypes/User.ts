export type User = {
  isLoggedIn: boolean;
  login: string;
  avatarUrl: string;
};

export type UserProps = {
  user: User;
};
