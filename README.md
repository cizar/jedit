# jedit
Asynchronous jQuery in-place edit plugin

```js
$('.editable').jedit('http://example.com/save.php');
```

## Sync

```js
$('.editable').jedit(function(value) {
  return value;
});
```

## Custom AJAX call

```js
$('.editable').jedit(function(value) {
  return $.post('http://example.com/save.php', { value: value });
});
```

## Custom promise

```js
$('.editable').jedit(function(value) {
  var d = $.Deferred();
  setTimeout(function() {
    d.resolve(value);
  }, 2000);
  return d.promise();
});
```

## Callback styled

```js
$('.editable').jedit(function(value, done) {
  setTimeout(function() {
    done(null, value);
  }, 2000);
});
```
