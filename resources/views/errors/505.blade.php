@extends('errors.illustrated-layout')

@section('title', __('HTTP Version Not Supported'))
@section('code', '505')
@section('message', __('Versi protokol HTTP yang digunakan oleh browser atau klien Anda tidak didukung oleh server kami.'))
