import { WhaleApiError, WhaleApiErrorType, WhaleApiException, WhaleApiValidationException } from '../../src'

it('WhaleApiException should be formatted as', () => {
  const error: WhaleApiError = {
    code: 404,
    type: WhaleApiErrorType.NotFound,
    at: 123,
    message: 'some message',
    url: '/link/to'
  }

  const exception = new WhaleApiException(error)

  expect(exception.message).toBe('404 - NotFound (/link/to): some message')
  expect(exception.code).toBe(404)
  expect(exception.type).toBe('NotFound')
  expect(exception.at).toBe(123)
  expect(exception.url).toBe('/link/to')
})

it('WhaleApiValidationException should includes properties', () => {
  const error = {
    code: 422,
    type: WhaleApiErrorType.ValidationError,
    at: 1234,
    url: '/link/to/validation/error',
    validation: {
      properties: [
        {
          property: 'key',
          value: 'value',
          constraints: [
            'value is missing'
          ]
        }
      ]
    }
  }

  const exception = new WhaleApiValidationException(error)

  expect(exception.message).toBe('422 - ValidationError (/link/to/validation/error)')
  expect(exception.code).toBe(422)
  expect(exception.type).toBe('ValidationError')
  expect(exception.properties).toEqual([
    {
      property: 'key',
      value: 'value',
      constraints: [
        'value is missing'
      ]
    }
  ])
})
