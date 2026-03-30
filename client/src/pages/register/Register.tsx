import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";
import config from "../../configs";
import useAuthState from "../../hooks/useAuthState";
import { registerUser } from "../../services/auth";
import { RegisterCredentials } from "../../types/TAuth";
import "./register.css";
export const Register = () => {
  //EXTENT 'RegisterCredentials' TYPE ALIAS
  type TRegisterForm = RegisterCredentials & {
    confirm_password: string;
  };

  const { errors: backendErrors } = useAuthState();

  // USE USE FORM HOOK
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<TRegisterForm>();

  const onSubmit = async (data: TRegisterForm) => {
    try {
      // OMIT 'confirm_password' WHEN SENDING DATA TO API.
      const { confirm_password, ...userData } = data;
      await registerUser(userData);
    } catch (error) {
      console.error(error);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <section className="vh-100 py-5">
      <div className="container d-flex flex-lg-row flex-column gap-5 justify-content-center align-items-center h-100">
        <header className="register-page__header d-flex align-items-center justify-content-center flex-column gap-4">
          <img
            src={`${config.api_url}/images/post_it.png`}
            className="w-75"
            alt="logo"
          />
          <h1 className="d-none d-lg-block fw-bold fs-2 text-uppercase">
            Post It with Confidence !
          </h1>
        </header>
        <form
          action=""
          className="register-page__form px-2 py-5  d-flex flex-column gap-4 align-items-center justify-content-center"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="register-page__form__body d-flex flex-column gap-4">
            <div className="row g-3">
              <div className="col-md-6">
                <label
                  className="form-label mb-1 text-success fw-medium"
                  htmlFor="first_name"
                >
                  First Name
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="first_name"
                  placeholder="Mohammed"
                  {...register("first_name", {
                    required: "First Name is Required",
                    minLength: {
                      value: 3,
                      message: "First name must be at least 3 characters!",
                    },
                  })}
                />
                {errors.first_name && (
                  <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                    {errors.first_name.message}
                  </span>
                )}
              </div>
              <div className="col-md-6">
                <label
                  className="form-label mb-1 text-success fw-medium"
                  htmlFor="last_name"
                >
                  Last Name
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="last_name"
                  placeholder="Khan"
                  {...register("last_name", {
                    required: "LAST NAME IS REQUIRED!",
                    minLength: {
                      value: 3,
                      message: "Last name must be at least 3 characters!",
                    },
                  })}
                />
                {errors.last_name && (
                  <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                    {errors.last_name.message}
                  </span>
                )}
              </div>
              <div className="col-md-6">
                <label
                  className="form-label mb-1 text-success fw-medium"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  className="form-control"
                  type="email"
                  id="email"
                  placeholder="exmaple@gmail.com"
                  {...register("email", {
                    required: "EMAIL IS REQUIRED!",
                    pattern: {
                      value: /\S+@\S+\.\S+/,
                      message:
                        "Invalid email format! Example: 'example@domain-name.com'",
                    },
                  })}
                />
                {errors.email && (
                  <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div className="col-md-6">
                <label
                  className="form-label mb-1 text-success fw-medium"
                  htmlFor="user_name"
                >
                  User Name
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="user_name"
                  placeholder="mohammed-khan"
                  {...register("user_name", {
                    required: "USERNAME IS REQUIRED!",
                    pattern: {
                      value: /^[a-z0-9_-]+$/,
                      message:
                        "USERNAME CAN ONLY CONTAIN LOWERCASE LETTERS, NUMBERS, UNDERSCORES, AND HYPHENS !",
                    },
                    minLength: {
                      value: 6,
                      message: "user name must be at least 6 characters !",
                    },
                    validate: {
                      noConsecutiveSymbols: (value: string) =>
                        (value && !/[-_]{2,}/.test(value)) ||
                        "USERNAME CANNOT CONTAIN CONSECUTIVE SYMBOLS!",
                      startWitLetterOrNumber: (value: string) =>
                        (value && /^[a-z]/.test(value)) ||
                        "USERNAME MUST START WITH A LETTER",
                    },
                  })}
                />
                {errors.user_name && (
                  <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                    {errors.user_name.message}
                  </span>
                )}
              </div>
              <div className="col-md-6">
                <label
                  className="form-label mb-1 text-success fw-medium"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative d-flex justify-content-between form-control">
                  <input
                    className="border-0 bg-transparent w-100"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="***********"
                    {...register("password", {
                      required: "PASSWORD IS REQUIRED!",
                      minLength: {
                        value: 8,
                        message: "PASSWORD MUST BE AT LEAST 8 CHARACTERS LONG!",
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
                {errors.password && (
                  <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                    {errors.password.message}
                  </span>
                )}
              </div>
              <div className="col-md-6">
                <label
                  className="form-label mb-1 text-success fw-medium"
                  htmlFor="confirm_password"
                >
                  Confirm Password
                </label>

                <div className="relative d-flex justify-content-between form-control">
                  <input
                    className="border-0 w-100"
                    type={showPassword ? "text" : "password"}
                    id="confirm_password"
                    placeholder="***********"
                    {...register("confirm_password", {
                      required: "CONFIRM PASSWORD IS REQUIRED!",
                      validate: (value: string) =>
                        value === watch("password") ||
                        "PASSWORDS DO NOT MATCH !",
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
                {errors.confirm_password && (
                  <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                    {errors.confirm_password.message}
                  </span>
                )}
              </div>
            </div>
            <button className="btn btn-post" type="submit">
              Register
            </button>
            <Link to="/login" className="btn-homie  text-center fw-light">
              I'm homie
            </Link>
          </div>
          {backendErrors && backendErrors.length > 0 && (
            <article className="w-100 text-center">
              {backendErrors.map((error, index) => (
                <p
                  key={index}
                  className="alert alert-warning mt-3 p-2 text-danger"
                >
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
