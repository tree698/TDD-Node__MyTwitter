import faker from 'faker';
import { TweetController } from '../tweet.js';
import httpMocks from 'node-mocks-http';

describe('TweetController', () => {
  let tweetRepository;
  let mockedSocket;
  let tweetController;

  beforeEach(() => {
    tweetRepository = {};
    mockedSocket = { emit: jest.fn() };
    tweetController = new TweetController(tweetRepository, () => mockedSocket);
  });

  describe('getTweets', () => {
    it('returns all tweets when username is not provided', async () => {
      const request = httpMocks.createRequest();
      const response = httpMocks.createResponse();
      const allTweets = [
        { text: faker.random.words(3) },
        { text: faker.random.words(3) },
      ];
      tweetRepository.getAll = () => allTweets;

      await tweetController.getTweets(request, response);

      expect(response.statusCode).toBe(200);
      expect(response._getJSONData()).toEqual(allTweets);
    });

    it('returns tweets for the given username when username is provided', async () => {
      const username = faker.internet.userName();
      const request = httpMocks.createRequest({
        query: { username },
      });
      const response = httpMocks.createResponse();
      const allTweetsByUsername = [{ tweet: faker.random.word(3) }];
      tweetRepository.getAllByUsername = () => allTweetsByUsername;

      await tweetController.getTweets(request, response);

      expect(response.statusCode).toBe(200);
      expect(response._getJSONData()).toEqual(allTweetsByUsername);
    });
  });

  describe('getTweet', () => {
    let tweetId, request, response;

    beforeEach(() => {
      tweetId = faker.random.alphaNumeric(16);
      request = httpMocks.createRequest({ params: { id: tweetId } });
      response = httpMocks.createResponse();
    });

    it('returns the tweet for the given id if tweet exists', async () => {
      const aTweet = [{ text: faker.random.words(3) }];
      tweetRepository.getById = jest.fn(() => aTweet);

      await tweetController.getTweet(request, response);

      expect(response.statusCode).toBe(200);
      expect(response._getJSONData()).toEqual(aTweet);
      expect(tweetRepository.getById).toHaveBeenCalledWith(tweetId);
    });

    it('returns 404 if tweet does not exist', async () => {
      tweetRepository.getById = () => undefined;

      await tweetController.getTweet(request, response);

      expect(response.statusCode).toBe(404);
      // expect(response._getJSONData().message).toBe(
      //   `Tweet id(${tweetId}) not found`
      // );
      expect(response._getJSONData()).toMatchObject({
        message: `Tweet id(${tweetId}) not found`,
      });
    });
  });

  describe('createTweet', () => {
    let newTweet, authorId, request, response;

    beforeEach(() => {
      newTweet = faker.random.word(3);
      authorId = faker.random.alphaNumeric(16);
      request = httpMocks.createRequest({
        body: { text: newTweet },
        userId: authorId,
      });
      response = httpMocks.createResponse();
    });

    it('returns 201 with created tweet object inclduing userId', async () => {
      tweetRepository.create = jest.fn((text, userId) => ({
        text,
        userId,
      }));

      await tweetController.createTweet(request, response);

      expect(response.statusCode).toBe(201);
      expect(response._getJSONData()).toMatchObject({
        text: newTweet,
        userId: authorId,
      });
      expect(tweetRepository.create).toHaveBeenCalledWith(newTweet, authorId);
    });

    it('should send an event to a websocket channel', async () => {
      tweetRepository.create = jest.fn((text, userId) => ({
        text: text,
        userId: userId,
      }));

      await tweetController.createTweet(request, response);

      expect(mockedSocket.emit).toHaveBeenCalledWith('tweets', {
        text: newTweet,
        userId: authorId,
      });
    });
  });

  describe('updateTweet', () => {
    let tweetId, authorId, updatedTweet, request, response;
    beforeEach(() => {
      tweetId = faker.random.alphaNumeric(16);
      authorId = faker.random.alphaNumeric(16);
      updatedTweet = faker.random.words(3);
      request = httpMocks.createRequest({
        params: { id: tweetId },
        body: { text: updatedTweet },
        userId: authorId,
      });
      response = httpMocks.createResponse();
    });

    it('update the repository and return 200', async () => {
      tweetRepository.getById = () => ({
        text: faker.random.words(3),
        userId: authorId,
      });
      tweetRepository.update = (tweetId, newTweet) => ({ text: newTweet });

      await tweetController.updateTweet(request, response);

      expect(response.statusCode).toBe(200);
      expect(response._getJSONData()).toMatchObject({ text: updatedTweet });
    });

    it('returns 403 and should not update the repository if the tweet does not belong to the user', async () => {
      tweetRepository.getById = () => ({
        text: faker.random.word(3),
        userId: faker.random.word(1),
      });
      tweetRepository.update = jest.fn();

      await tweetController.updateTweet(request, response);

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 and should not update the repository if the tweet does not exist', async () => {
      tweetRepository.getById = () => undefined;
      tweetRepository.update = jest.fn();

      await tweetController.updateTweet(request, response);

      expect(response.statusCode).toBe(404);
      expect(response._getJSONData().message).toBe(
        `Tweet not found: ${tweetId}`
      );
    });
  });

  describe('deleteTweet', () => {
    let tweetId, authorId, request, response;
    beforeEach(() => {
      tweetId = faker.random.alphaNumeric(16);
      authorId = faker.random.alphaNumeric(16);
      request = httpMocks.createRequest({
        params: { id: tweetId },
        userId: authorId,
      });
      response = httpMocks.createResponse();
    });

    it('returns 204 and remove the tweet from the repository if the tweet exists', async () => {
      tweetRepository.getById = () => ({
        userId: authorId,
      });
      tweetRepository.remove = jest.fn();

      await tweetController.deleteTweet(request, response);

      expect(response.statusCode).toBe(204);
      expect(tweetRepository.remove).toHaveBeenCalledWith(tweetId);
    });

    it('returns 403 and should not update the repository if the tweet does not belong to the user', async () => {
      tweetRepository.getById = () => ({
        userId: undefined,
      });
      tweetRepository.remove = jest.fn();

      await tweetController.deleteTweet(request, response);

      expect(response.statusCode).toBe(403);
      expect(tweetRepository.remove).not.toHaveBeenCalled();
    });

    it('returns 404 and should not update the repository if the tweet does not exist', async () => {
      tweetRepository.getById = () => undefined;
      tweetRepository.remove = jest.fn();

      await tweetController.deleteTweet(request, response);

      expect(response.statusCode).toBe(404);
      expect(response._getJSONData().message).toBe(
        `Tweet not found: ${tweetId}`
      );
      expect(tweetRepository.remove).not.toHaveBeenCalled();
    });
  });
});
