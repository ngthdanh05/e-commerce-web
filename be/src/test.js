// console.log("begins");

// setTimeout(() => {
//   console.log("setTimeout 1");
//   Promise.resolve().then(() => {
//     console.log("promise 1");
//   });
// }, 0);

// new Promise((resolve, reject) => {
//   console.log("promise 2");
//   setTimeout(function () {
//     console.log("setTimeout 2");
//     resolve("resolve 1");
//   }, 0);
// }).then((res) => {
//   console.log("dot then 1");
//   setTimeout(() => {
//     console.log(res);
//   }, 0);
// });

//nâng cao hơn xíu nữa
async function async1() {
  console.log("async1 start");
  await async2();
  console.log("async1 end");
}

async function async2() {
  console.log("async2 start");
  await new Promise((resolve) => {
    console.log("async2 promise");
    setTimeout(() => {
      console.log("async2 setTimeout");
      resolve();
    }, 0);
  });
  console.log("async2 end");
}

async1();

console.log("script start");

setTimeout(function () {
  console.log("setTimeout");
}, 0);

new Promise(function (resolve) {
  console.log("promise1");
  resolve("resolve 1");
})
  .then((res) =>
    setTimeout(() => {
      console.log(res);
    }, 0)
  )
  .then(function () {
    console.log("promise2");
  });

console.log("script end");

//test tren git hub
