import numpy as np
import base64
import uuid

_object_registry = dict(
    objects=dict()
)

def reactopya_serialize(x):
    if isinstance(x, np.ndarray):
        return _serialize_ndarray(x)
    elif isinstance(x, np.integer):
        return int(x)
    elif isinstance(x, np.floating):
        return float(x)
    elif type(x) == dict:
        ret = dict()
        for key, val in x.items():
            ret[key] = reactopya_serialize(val)
        return ret
    elif type(x) == list:
        ret = []
        for val in x:
            ret.append(reactopya_serialize(val))
        return ret
    elif _is_jsonable(x):
        return x
    else:
        code = '@reactopya-python-object@' + uuid.uuid4().hex.upper()
        _object_registry['objects'][code] = x
        return code

def _is_jsonable(x):
    import simplejson
    try:
        simplejson.dumps(x)
        return True
    except:
        return False

def reactopya_deserialize(x):
    if type(x) == str:
        if x.startswith('@reactopya-python-object@'):
            return _object_registry['objects'][x]
        else:
            return x
    elif type(x) == dict:
        if '_reactopya_type' in x and x['_reactopya_type'] == '@reactopya-ndarray@':
            return _deserialize_ndarray(x)
        else:
            ret = dict()
            for key, val in x.items():
                ret[key] = reactopya_deserialize(val)
            return ret
    elif type(x) == list:
        ret = []
        for val in x:
            ret.append(reactopya_deserialize(val))
        return ret
    else:
        return x

def _serialize_ndarray(x: np.ndarray):
    if x.dtype == np.int64 or x.dtype == np.uint64:
        # the int64 and uint64 cannot be json-serialized on the js side, so we convert to float64.
        x = x.astype(np.float64)
    return dict(
        _reactopya_type='@reactopya-ndarray@',
        shape=list(x.shape),
        dtype=str(x.dtype),
        data_b64=base64.b64encode(x.tobytes(order='C')).decode('utf-8')
    )

def _deserialize_ndarray(x: dict):
    assert x['_reactopya_type'] == '@reactopya-ndarray@'
    shape = tuple(x['shape'])
    dtype = np.dtype(x['dtype'])
    data = base64.b64decode(x['data_b64'])
    return np.frombuffer(buffer=data, dtype=dtype).reshape(shape)
