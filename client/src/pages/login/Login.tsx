import { CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import config from '../../configs';
import useAuthStore from '../../stores/useAuthStore';
import { loginUser } from '../../services/auth';
import { LoginCredentials } from '../../types/TAuth';
import './login.css';

export const Login = () => {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const errors = useAuthStore((s) => s.errors);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    if (user) {
      console.log('User authenticated, redirecting to home');
      navigate('/');
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<LoginCredentials>();

  const onSubmit: SubmitHandler<LoginCredentials> = async (loginData: LoginCredentials) => {
    try {
      await loginUser(loginData);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const imageUrl = `${config.api_url}/images/post_it.png`;

  return (
    <section className="vh-100 py-5">
      <div className="container d-flex justify-content-center align-items-center h-100 gap-5">
        <header className="login-page__header d-flex align-items-center justify-content-center flex-column gap-4">
          <img
            src={imageUrl}
            className="w-75"
            alt="logo"
            onError={(e) => {
              console.error('Error loading image: ', e);
              console.log('current src: ', e.currentTarget.src);
            }}
          />
          <h1 className="login-page__header-title d-none d-lg-block fw-bold fs-2 text-uppercase">
            A warm Welcome Back !
          </h1>
        </header>
        <form
          action=""
          onSubmit={handleSubmit(onSubmit)}
          className="login-page__form px-2 py-5  d-flex flex-column gap-4 align-items-center justify-content-center"
        >
          <div className="login-page__body d-flex flex-column gap-4">
            <div className="d-flex flex-column">
              <label className="form-label text-success fw-medium" htmlFor="email">
                Email
              </label>
              <input
                className="form-control"
                type="email"
                id="email"
                placeholder="exmaple@gmail.com"
                autoComplete="off"
                {...register('email', {
                  required: 'EMAIL IS REQUIRED!',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Invalid email format! Example: 'example@domain-name.com'",
                  },
                })}
              />
              {formErrors.email && (
                <span className="alert alert-warning p-2 text-danger text-center mt-1">
                  {formErrors.email.message}
                </span>
              )}
            </div>
            <div className="d-flex flex-column">
              <label className="form-label text-success fw-medium" htmlFor="password">
                Password
              </label>

              <div className="relative d-flex justify-content-between form-control">
                <input
                  className="border-0 bg-transparent w-100"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="***********"
                  {...register('password', {
                    required: 'PASSWORD IS REQUIRED!',
                    minLength: {
                      value: 8,
                      message: 'PASSWORD MUST BE AT LEAST 8 CHARACTERS LONG!',
                    },
                  })}
                />
                <button
                  type="button"
                  className="border-0 bg-transparent"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <FaEyeSlash className="text-success" />
                  ) : (
                    <FaEye className="text-success" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <span className="alert alert-warning p-2 text-danger text-center mt-1">
                  {formErrors.password.message}
                </span>
              )}
            </div>
            <button className="btn btn-post" type="submit">
              {loading ? <CircularProgress size={'20px'} /> : 'Login'}
            </button>
            <Link to="/register" className="btn-new fw-light text-center">
              I'm new Here!
            </Link>
          </div>
          {errors && errors.length > 0 && (
            <article className="w-100 text-center">
              {errors.map((error: string, index: number) => (
                <p key={index} className="alert alert-warning p-2 mt-3 text-danger">
                  {error}
                </p>
              ))}
            </article>
          )}
        </form>
      </div>
    </section>
  );
};
