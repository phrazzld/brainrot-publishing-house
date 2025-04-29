/**
 * Basic test file to verify Jest is working properly
 * This test works around TypeScript/ESM issues to demonstrate syntax validity
 */

describe('Basic functionality tests', () => {
  it('should work with simple assertions', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should handle mock functions', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
  
  it('should be able to spy on objects', () => {
    const obj = {
      method: () => true
    };
    
    const spy = jest.spyOn(obj, 'method');
    obj.method();
    expect(spy).toHaveBeenCalled();
  });
});