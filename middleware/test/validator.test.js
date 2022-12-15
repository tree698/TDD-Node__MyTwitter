import httpMocks from 'node-mocks-http';
import faker from 'faker';
import { validate } from '../validator.js';
import * as validator from 'express-validator';

jest.mock('express-validator');

describe('Validation Middleware', () => {
  it('calls next if there are no validation errors', async () => {
    //given
    const request = httpMocks.createRequest();
    const response = httpMocks.createResponse();
    const next = jest.fn();
    validator.validationResult = jest.fn(() => ({
      isEmpty: () => true,
    }));

    //when
    await validate(request, response, next);

    //then
    expect(next).toBeCalled();
  });

  it('returns 400 if there are validation errors', async () => {
    const errorWord = faker.random.words(3);
    const request = httpMocks.createRequest();
    const response = httpMocks.createResponse();
    const next = jest.fn();
    validator.validationResult = jest.fn(() => ({
      isEmpty: () => false,
      array: () => [{ msg: errorWord }],
    }));

    await validate(request, response, next);

    console.log(errorWord);
    expect(next).not.toBeCalled();
    expect(response.statusCode).toBe(400);
    expect(response._getJSONData().message).toBe(errorWord);
  });
});
