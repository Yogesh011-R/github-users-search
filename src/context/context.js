import React, { useState, useEffect, createContext } from 'react';
import axios from 'axios';

const rootUrl = process.env.ROOT_URL;
const SESSION_KEY = process.env.SESSION_KEY;

export const GithubContext = createContext();

const getSessionStorage = () =>
  sessionStorage.getItem(SESSION_KEY)
    ? JSON.parse(sessionStorage.getItem(SESSION_KEY))
    : [];

const data = getSessionStorage();

export const GithubProvider = ({ children }) => {
  const [githubUser, setGithubUser] = useState(data.users || []);
  const [repos, setRepos] = useState(data.repos || []);
  const [followers, setFollowers] = useState(data.followers || []);

  const [requests, setRequests] = useState(0);
  const [isloading, setIsloading] = useState(false);
  // errors
  const [error, setError] = useState({ show: false, msg: '' });

  const searchGithubUser = async user => {
    toggleError();

    setIsloading(true);
    try {
      const respons = await axios(`${rootUrl}/users/${user}`);

      if (respons) {
        setGithubUser(respons.data);
        const { login, followers_url } = respons.data;
        // REPOS

        // Followers
        // axios(`${rootUrl}/users/${login}/repos?per_page=100`).then(respons =>
        //   setRepos(respons.data)
        // );

        // axios(`${followers_url}?per_page=100`).then(respons => {
        //   setFollowers(respons.data);
        // });

        await Promise.allSettled([
          axios(`${rootUrl}/users/${login}/repos?per_page=100`),
          axios(`${followers_url}?per_page=100`),
        ])
          .then(results => {
            const [repos, followers] = results;
            const status = 'fulfilled';

            if (repos.status === status && followers.status === status) {
              setRepos(repos.value.data);
              setFollowers(followers.value.data);
            }
          })
          .catch(err => console.log(err));

        setIsloading(false);
      } else {
        toggleError(true, 'there is no user with that userName');
        setIsloading(false);
      }
    } catch (error) {
      console.log(error);

      toggleError(true, 'there is no user with that userName');
      setIsloading(false);
    }
    checkRequest();
    setIsloading(false);
  };

  //  checkrate
  const checkRequest = () => {
    axios(`${rootUrl}/rate_limit`)
      .then(({ data }) => {
        let {
          rate: { remaining },
        } = data;
        setRequests(remaining);
        if (remaining === 0) {
          // throw error
          toggleError(true, 'you have exceeded your hourly rate limit !');
        }
      })
      .catch(err => console.log(err));
  };
  function toggleError(show = false, msg = '') {
    setError({
      show,
      msg,
    });
  }

  // error
  useEffect(checkRequest, []);

  useEffect(() => {
    getSessionStorage();
    return () => {};
  }, []);
  // Session Storage

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      users: githubUser,
      repos,
      followers,
    })
  );

  return (
    <GithubContext.Provider
      value={{
        githubUser,
        repos,
        followers,
        requests,
        error,
        isloading,
        searchGithubUser,
      }}
    >
      {children}
    </GithubContext.Provider>
  );
};
