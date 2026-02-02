// const asyncHandler = (requestHandler) => {
//     return async (req, res, next) => {
//         Promise.resolve(requestHandler(req, res, next)).catch(error => next(error));
// }

const asyncHandler = (requestHandler) => (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
};


export { asyncHandler}