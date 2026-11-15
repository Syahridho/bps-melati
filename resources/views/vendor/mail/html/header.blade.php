@props(['url'])
@if ($slot->isNotEmpty())
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
    @if (trim($slot) === 'Laravel')
        <img src="https://laravel.com/img/notification-logo-v2.1.png" class="logo" alt="Laravel Logo">
    @elseif (file_exists(public_path('logo-melati.png')))
        <img src="{{ asset('logo-melati.png') }}" class="logo" alt="{{ config('app.name') }}">
    @else
        {!! $slot !!}
    @endif
</a>
</td>
</tr>
@endif
