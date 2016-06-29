///<reference path="../typings/suitescript-1.0.d.ts"/>
///<reference path="../typings/index.d.ts"/>
"use strict";
require('./console-log');
var Search = require('./search');
var Sublist = require('./sublist');
//record cache
var _cache = {};
//which fields to preload
var __fieldConf = {};
//init
try {
    var conf = nlapiGetContext().getSetting('SCRIPT', 'custscript_fieldconf');
    __fieldConf = JSON.parse(conf) || {};
}
catch (e) {
    console.error('ERROR', 'não carregou baseconf');
}
var _window;
exports.setWindow = function (wind) {
    _window = wind;
};
exports.factory = recordFactory;
function recordFactory(meta) {
    meta.fld = meta.fld || {};
    meta.sublists = meta.sublists || {};
    meta.fld.externalid = 'externalid';
    meta.fld.internalid = 'internalid';
    meta.unique = meta.unique || {};
    var __fldInverseMemo;
    function fldInverse() {
        if (__fldInverseMemo)
            return __fldInverseMemo;
        var out = {};
        for (var it in meta.fld) {
            out[meta.fld[it]] = it;
        }
        __fldInverseMemo = out;
        return __fldInverseMemo;
    }
    var __sublists = meta.sublists || {};
    var __doCache = true;
    var __exposed = [];
    var __customMethods = __preRegisterMethod[meta.code] || {};
    if (__preRegisterMethod[meta.code])
        delete __preRegisterMethod[meta.code];
    //_fieldCache : {} ,
    //_origin : null,
    //record : <nlobjRecord>null ,
    //_callers : <typeof _callers>null 
    function build(state) {
        //instance methods below
        state.fieldCache = state.fieldCache || {};
        state.submitCache = state.submitCache || {};
        var rec = {
            f: function (field) {
                if (!field)
                    throw console.error('Record.f recebeu parâmetro vazio.');
                if (!meta.fld[field]) {
                    throw console.error('Campo ' + field + ' não cadastrado.');
                }
                else {
                    field = meta.fld[field];
                }
                if (state.fieldCache[field])
                    return state.fieldCache[field];
                var fields = __fieldConf[meta.code] || [];
                var found = ~fields.indexOf(field);
                //se houver fieldconf, carregar todos os campos para o cache
                if (fields.length && found) {
                    var resp = state.callers.fs(rec, fields);
                    for (var it_1 in resp) {
                        state.fieldCache[it_1] = resp[it_1];
                    }
                    return state.fieldCache[field];
                }
                else {
                    __fieldConf[meta.code] = __fieldConf[meta.code] || [];
                    __fieldConf[meta.code].push(field);
                    state.fieldCache[field] = state.callers.f(rec, field);
                    return state.fieldCache[field];
                }
            },
            ftext: function (field) {
                if (!field)
                    throw console.error('Record.f recebeu parâmetro vazio.');
                if (!meta.fld[field]) {
                    throw console.error('Campo ' + field + ' não cadastrado.');
                }
                else {
                    field = meta.fld[field];
                }
                return state.callers.ftext(rec, field);
            },
            ftextraw: function (name) {
                var field = fldInverse()[name];
                if (!field)
                    throw nlapiCreateError('ftextraw', "Field " + name + " not found.");
                return rec.ftext(field);
            },
            fraw: function (name) {
                var field = fldInverse()[name];
                if (!field)
                    throw nlapiCreateError('fraw', "Field " + name + " not found.");
                return rec.f(field);
            },
            fjoin: function (field, field2) {
                if (!field)
                    throw console.error('Record.fjoin recebeu parâmetro vazio.');
                if (!meta.fld[field]) {
                    throw console.error('Campo ' + field + ' não cadastrado.');
                }
                else {
                    field = meta.fld[field];
                }
                if (state.fieldCache[field + '.' + field2])
                    return state.fieldCache[field + '.' + field2];
                var fields = __fieldConf[meta.code] || [];
                var found = ~fields.indexOf(field + '.' + field2);
                //se houver fieldconf, carregar todos os campos para o cache
                if (fields.length && found) {
                    var resp = state.callers.fs(rec, fields);
                    for (var it_2 in resp) {
                        state.fieldCache[it_2] = resp[it_2];
                    }
                    return state.fieldCache[field + '.' + field2];
                }
                else {
                    __fieldConf[meta.code] = __fieldConf[meta.code] || [];
                    __fieldConf[meta.code].push(field + '.' + field2);
                    state.fieldCache[field + '.' + field2] = state.callers.f(rec, field + '.' + field2);
                    return state.fieldCache[field + '.' + field2];
                }
            },
            fset: function (field, value) {
                if (Array.isArray(field))
                    throw console.error('fset não recebe array.');
                if (!meta.fld[field]) {
                    throw console.error('Campo ' + field + ' não cadastrado.');
                }
                else
                    field = meta.fld[field];
                state.fieldCache[field] = value;
                state.submitCache = state.submitCache || {};
                state.submitCache[field] = value;
                return rec;
            },
            fsetraw: function (name, value) {
                var field = fldInverse()[name];
                if (!field)
                    throw nlapiCreateError('fraw', "Field " + name + " not found.");
                return rec.fset(field, value);
            },
            put: function (data) {
                if (Array.isArray(data))
                    throw nlapiCreateError('RTAPE_PUT', 'Array not expected in rtape#put');
                for (var it in data) {
                    rec.fset(it, data[it]);
                }
                return rec;
            },
            json: function () {
                var jsout = __exposed.reduce(function (bef, field) {
                    bef[field] = rec.f(field);
                    return bef;
                }, {});
                jsout.id = rec.id;
                return jsout;
            },
            submit: function (opts) {
                _cache[(meta.code + '|' + rec.id)] = rec;
                if (rec.id === null && !opts.noUniqueCheck) {
                    for (var it_3 in meta.unique) {
                        var fields = meta.unique[it_3];
                        var anyempty = fields.some(function (f) {
                            return !state.fieldCache[f];
                        });
                        if (anyempty)
                            continue;
                        var _expr = fields.map(function (f) {
                            return [f, 'anyof', state.fieldCache[f]];
                        });
                        var expr = [];
                        for (var it2 = 0; it2 < _expr.length; it2++) {
                            expr.push(_expr[it2]);
                            if (Number(it2) < _expr.length - 1)
                                expr.push('and');
                        }
                        var search = Static.search(expr).run();
                        if (search.length)
                            throw nlapiCreateError('RTAPE_CONSTRAINT', "Record create constraint failed " +
                                ("for key " + JSON.stringify(fields) + " when attempting to save " + JSON.stringify(state.fieldCache)));
                    }
                }
                state.callers.submit(rec);
                return rec;
            },
            delete: function () {
                if (_cache[(meta.code + '|' + state.id)])
                    delete _cache[(meta.code + '|' + state.id)];
                return nlapiDeleteRecord(rec.meta.code, String(rec.id));
            },
            sublist: function (name, tgtclass, opts) {
                opts = opts || { allFields: true };
                if (!tgtclass) {
                    throw nlapiCreateError('sublist', 'Missing 2nd parameter.');
                }
                var field = meta.sublists[name];
                if (!field)
                    throw nlapiCreateError('sublist', "Unregistered sublist " + name + ".");
                if (state.origin == 'record') {
                    var out = [];
                    var wrap = Sublist.fromRtape(rec, tgtclass, name);
                    for (var it = 1; it <= wrap.count(); it++) {
                        var item = tgtclass.fromRecordSublist(wrap, wrap.idFromLine(it));
                        out.push(item);
                    }
                    return out;
                }
                else {
                    if (field.substr(0, 'recmach'.length) == 'recmach') {
                        field = field.substr('recmach'.length);
                    }
                    var cols = [];
                    if (opts.allFields) {
                        for (var it_4 in tgtclass.fld) {
                            cols.push(tgtclass.fld[it_4]);
                        }
                    }
                    else {
                        cols = __fieldConf[tgtclass.meta.code] || [];
                    }
                    var res = nlapiSearchRecord(tgtclass.meta.code, null, [field, 'anyof', state.id], Search.cols(cols)) || [];
                    return res.map(function (r) {
                        return tgtclass.fromSearchResult(r);
                    });
                }
            },
            get id() { return Number(state.id); },
            get fld() { return meta.fld; },
            get code() { return meta.code; },
            getStatic: function () { return Static; },
            state: state,
            meta: meta
        };
        __exposed.forEach(function (name) {
            Object.defineProperty(rec, name, {
                enumerable: false,
                get: function () {
                    return rec.f(name);
                },
                set: function (value) {
                    return rec.fset(name, value);
                }
            });
        });
        for (var it in __customMethods) {
            rec[it] = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                args = [rec].concat(args);
                return __customMethods[it].apply(rec, args);
            };
        }
        return rec;
    }
    var Static = {
        getCode: function (id) {
            return meta.code;
        },
        create: function () {
            return build({
                origin: 'record',
                code: meta.code,
                record: nlapiCreateRecord(meta.code),
                callers: _callers.Record,
                id: null
            });
        },
        fromId: function (id, opts) {
            opts = opts || {};
            if (!opts.noCache && _cache[(meta.code + '|' + id)])
                return _cache[(meta.code + '|' + id)];
            var out = build({
                code: Static.getCode(id),
                id: Number(id),
                origin: 'id',
                callers: _callers.Id
            });
            _cache[(meta.code + '|' + id)] = out;
            return out;
        },
        fromRecord: function (inp) {
            var id = (typeof inp == 'object') ? inp.getId() : inp;
            if (_cache[(meta.code + '|' + id)])
                return _cache[(meta.code + '|' + id)];
            //out.code = Record._getCode(id);
            var rec;
            if (typeof inp == 'number' || typeof inp == 'string')
                rec = nlapiLoadRecord(meta.code, inp);
            else
                rec = inp;
            var out = build({
                code: Static.getCode(id),
                origin: 'record',
                callers: _callers.Record,
                record: rec
            });
            _cache[(meta.code + '|' + id)] = out;
            return out;
        },
        fromRecordSublist: function (sl, id) {
            if (_cache[(meta.code + '|' + id)])
                return _cache[(meta.code + '|' + id)];
            var out = build({
                code: Static.getCode(id),
                objSublist: sl,
                origin: 'recordsublist',
                id: Number(id),
                line: sl.lineFromId(Number(id)),
                callers: _callers.RecordSublist,
            });
            _cache[(meta.code + '|' + id)] = out;
            return out;
        },
        fromSearchResult: function (res) {
            if (_cache[meta.code + '|' + res.id])
                return _cache[meta.code + '|' + res.id];
            var out = build({
                code: Static.getCode(res.id),
                origin: 'search',
                callers: _callers.Search,
                result: res,
                id: Number(res.id),
            });
            _cache[meta.code + '|' + res.id] = out;
            return out;
        },
        fromCurrentClient: function (wind) {
            var id = Number(nlapiGetRecordId());
            if (_cache[(meta.code + '|' + id)])
                return _cache[(meta.code + '|' + id)];
            var out = build({
                code: Static.getCode(id),
                window: wind || _window || window,
                origin: 'client',
                callers: _callers.Client,
                id: id,
                fieldCache: {}
            });
            _cache[meta.code + '|' + id] = out;
            return out;
        },
        search: function (arg1, arg2, arg3) {
            var opts, filters, columns;
            if (Array.isArray(arg1)) {
                opts = {};
                filters = arg1;
                columns = arg3;
            }
            else {
                opts = arg1;
                filters = arg2;
                columns = arg3;
            }
            return Search.search(opts, Static, filters, columns);
        },
        curryf: function (field) {
            return function (id) {
                var inst = Static.fromId(id);
                return inst.f(field);
            };
        },
        end: function () {
            var sid = nlapiGetContext().getScriptId();
            var did = 'customdeploy' + sid.substr('customscript'.length);
            var res = nlapiSearchRecord('scriptdeployment', null, ['scriptid', 'is', did]);
            var rec = nlapiLoadRecord('scriptdeployment', res[0].id);
            rec.setFieldValue('custscript_fieldconf', JSON.stringify(__fieldConf));
            nlapiSubmitRecord(rec);
        },
        expose: function (fields) {
            (fields || []).forEach(function (field) {
                if (!meta.fld[field])
                    throw nlapiCreateError('recordExpose', 'Campo ' + field + ' não está definido neste registro.');
                __exposed.push(field);
            });
        },
        exposeAll: function () {
            var fields = [];
            for (var it in meta.fld) {
                fields.push(it);
            }
            return Static.expose(fields);
        },
        registerMethod: function (name, method) {
            __customMethods[name] = method;
        },
        get code() { return meta.code; },
        get fld() { return meta.fld; },
        meta: meta,
        idField: meta.idField || 'id'
    };
    __moduleCache[meta.code] = Static;
    return Static;
}
exports.recordFactory = recordFactory;
var dummyStatic = null && recordFactory(1);
var __moduleCache = {};
var __preRegisterMethod = {};
function module(code) {
    if (__moduleCache[code])
        return __moduleCache[code];
    __preRegisterMethod[code] = {};
    var Stub = {
        stub: true,
        registerMethod: function (name, method) {
            __preRegisterMethod[code][name] = method;
        },
        get code() { return code; },
    };
    __moduleCache[code] = Stub;
    return __moduleCache[code];
}
exports.module = module;
var _callers = {
    Id: {
        f: function (rec, field) {
            console.log('lookupField ', rec.meta.code, field, rec.id);
            return nlapiLookupField(rec.meta.code, rec.id, field);
        },
        fs: function (rec, fields) {
            console.log('fs ', rec.meta.code, fields, rec.id);
            return nlapiLookupField(rec.meta.code, rec.id, fields);
        },
        ftext: function (rec, field) {
            throw nlapiCreateError('ftext', 'not implemented');
        },
        submit: function (rec) {
            var fields = [];
            var values = [];
            for (var it in rec.state.submitCache) {
                fields.push(it);
                values.push(rec.state.submitCache[it]);
            }
            nlapiSubmitField(rec.meta.code, String(rec.id), fields, values);
            rec.state.submitCache = {};
        }
    },
    Record: {
        f: function (rec, field) {
            return rec.state.record.getFieldValue(field);
        },
        fs: function (rec, fields) {
            return fields.reduce(function (bef, curr) {
                bef[curr] = rec.state.record.getFieldValue(curr);
                return bef;
            }, {});
        },
        ftext: function (rec, field) {
            return rec.state.record.getFieldText(field);
        },
        submit: function (rec) {
            for (var it in rec.state.submitCache) {
                rec.state.record.setFieldValue(it, rec.state.submitCache[it]);
            }
            rec.id = Number(nlapiSubmitRecord(rec.state.record));
            rec.state.submitCache = {};
        }
    },
    Search: {
        f: function (rec, field) {
            var allcols = rec.state.result.getAllColumns() || [];
            if (~(allcols.map(function (c) { return c.getName(); })).indexOf(field)) {
                return rec.state.result.getValue(field);
            }
            return _callers.Id.f(rec, field);
        },
        fs: function (rec, fields) {
            var allcols = rec.state.result.getAllColumns() || [];
            var found = [], notFound = [];
            fields.forEach(function (field) {
                var has = (allcols.map(function (c) { return c.getName(); })).indexOf(field) != -1;
                if (has)
                    found.push(field);
                else
                    notFound.push(field);
            });
            var out = {};
            found.forEach(function (field) {
                out[field] = rec.state.result.getValue(field);
            });
            var _lookup = nlapiLookupField(rec.code, rec.id, notFound);
            for (var it in _lookup) {
                out[it] = _lookup[it];
            }
            return out;
        },
        ftext: function (rec, field) {
            var allcols = rec.state.result.getAllColumns() || [];
            if (~(allcols.map(function (c) { return c.getName(); })).indexOf(field)) {
                return rec.state.result.getText(field);
            }
            return _callers.Id.ftext(rec, field);
        },
        submit: function (rec) {
            return _callers.Id.submit(rec);
        }
    },
    RecordSublist: {
        f: function (rec, field) {
            return rec.state.objSublist.value(field, rec.state.line);
        },
        fs: function (rec, fields) {
            return fields.reduce(function (bef, curr) {
                bef[curr] = rec.state.objSublist.value(curr, rec.state.line);
                return bef;
            }, {});
        },
        ftext: function (rec, field) {
            return rec.state.objSublist.text(field, rec.state.line);
        },
        submit: function () {
            throw 'Não implementado';
            /*
            if (!Array.isArray(fields)) {
                fields = [fields];
                values = [values];
            }
            var l = fields.length;
            for (var it = 0; it < l; it++) {
                rec.objSublist.setValue(fields[it], rec._line, values[it]);
            }
            */
        }
    },
    Client: {
        f: function (rec, field) {
            return rec.state.window.nlapiGetFieldValue(field);
        },
        fs: function (rec, fields) {
            return fields.reduce(function (bef, curr) {
                bef[curr] = rec.state.window.nlapiGetFieldValue(curr);
                return bef;
            }, {});
        },
        ftext: function (rec, field) {
            return rec.state.window.nlapiGetFieldText(field);
        },
        submit: function (rec) {
            for (var it in rec.state.submitCache) {
                rec.state.window.nlapiSetFieldValue(it, rec.state.submitCache[it]);
            }
            rec.state.submitCache = {};
        }
    }
};
